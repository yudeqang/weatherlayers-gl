import type {Color} from '@deck.gl/core';
import type {ImageProperties} from '../../_utils/image-properties.js';
import type {FloatData} from '../../_utils/texture-data.js';
import {getRasterMagnitudeData} from '../../_utils/raster-data.js';
import {getUnprojectFunction} from '../../_utils/project.js';

export type LabelZoomThreshold = [number, number];

export const DEFAULT_LABEL_ZOOM_THRESHOLDS: LabelZoomThreshold[] = [
  [2, 9],
  [5, 7],
  [10, 5],
];

export interface LabelContourPathProperties {
  value: number;
  major: boolean;
}

export interface LabelContourLabelProperties {
  value: number;
  angle: number;
  pathLength: number;
  minZoom: number;
}

export type LabelContourPath = GeoJSON.Feature<GeoJSON.LineString, LabelContourPathProperties>;
export type LabelContourLabel = GeoJSON.Feature<GeoJSON.Point, LabelContourLabelProperties>;

export interface LabelContourFeatureCollection {
  paths: LabelContourPath[];
  labels: LabelContourLabel[];
}

export interface LabelContourOptions {
  bounds: GeoJSON.BBox;
  interval: number;
  majorInterval: number;
  contourValues: number[] | null;
  fieldSmoothing: number;
  smooth: boolean;
  smoothIterations: number;
  labelVisible: boolean;
  labelStep: number;
  labelZoomThresholds: LabelZoomThreshold[];
}

interface PixelPoint {
  x: number;
  y: number;
}

interface Segment {
  start: GeoJSON.Position;
  end: GeoJSON.Position;
  value: number;
}

const EPSILON = 1e-9;

function smoothMagnitudeData(image: FloatData, iterations: number): FloatData {
  let source = image.data;
  const {width, height} = image;
  const count = Math.max(Math.round(iterations), 0);

  for (let iteration = 0; iteration < count; iteration++) {
    const target = new Float32Array(source.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let sum = 0;
        let weightSum = 0;

        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const sampleX = Math.min(Math.max(x + dx, 0), width - 1);
            const sampleY = Math.min(Math.max(y + dy, 0), height - 1);
            const value = source[sampleX + sampleY * width];
            if (isNaN(value)) {
              continue;
            }

            const weight = dx === 0 && dy === 0 ? 4 : (dx === 0 || dy === 0 ? 2 : 1);
            sum += value * weight;
            weightSum += weight;
          }
        }

        target[x + y * width] = weightSum ? sum / weightSum : NaN;
      }
    }

    source = target;
  }

  return {data: source, width, height};
}

function getContourLevels(data: Float32Array, interval: number, contourValues: number[] | null): number[] {
  if (contourValues?.length) {
    return contourValues;
  }
  if (!interval) {
    return [];
  }

  let minValue = Infinity;
  let maxValue = -Infinity;
  for (const value of data) {
    if (isNaN(value)) {
      continue;
    }
    minValue = Math.min(minValue, value);
    maxValue = Math.max(maxValue, value);
  }
  if (!isFinite(minValue) || !isFinite(maxValue)) {
    return [];
  }

  const start = Math.ceil(minValue / interval) * interval;
  const end = Math.floor(maxValue / interval) * interval;
  const levels: number[] = [];
  for (let value = start; value <= end + EPSILON; value += interval) {
    levels.push(Number(value.toFixed(10)));
  }
  return levels;
}

function getCellValue(image: FloatData, x: number, y: number): number {
  return image.data[x + y * image.width];
}

function interpolate(level: number, a: number, b: number): number {
  const delta = b - a;
  if (Math.abs(delta) < EPSILON) {
    return 0.5;
  }
  return Math.min(Math.max((level - a) / delta, 0), 1);
}

function crosses(level: number, a: number, b: number): boolean {
  return (a < level && b >= level) || (b < level && a >= level);
}

function getCellIntersections(image: FloatData, x: number, y: number, level: number): PixelPoint[] {
  const topLeft = getCellValue(image, x, y);
  const topRight = getCellValue(image, x + 1, y);
  const bottomRight = getCellValue(image, x + 1, y + 1);
  const bottomLeft = getCellValue(image, x, y + 1);

  if ([topLeft, topRight, bottomRight, bottomLeft].some(value => isNaN(value))) {
    return [];
  }

  const points: PixelPoint[] = [];
  if (crosses(level, topLeft, topRight)) {
    points.push({x: x + interpolate(level, topLeft, topRight), y});
  }
  if (crosses(level, topRight, bottomRight)) {
    points.push({x: x + 1, y: y + interpolate(level, topRight, bottomRight)});
  }
  if (crosses(level, bottomRight, bottomLeft)) {
    points.push({x: x + 1 - interpolate(level, bottomRight, bottomLeft), y: y + 1});
  }
  if (crosses(level, bottomLeft, topLeft)) {
    points.push({x, y: y + 1 - interpolate(level, bottomLeft, topLeft)});
  }

  return points;
}

function getSegments(image: FloatData, bounds: GeoJSON.BBox, level: number): Segment[] {
  const unproject = getUnprojectFunction(image.width, image.height, bounds);
  const segments: Segment[] = [];

  for (let y = 0; y < image.height - 1; y++) {
    for (let x = 0; x < image.width - 1; x++) {
      const points = getCellIntersections(image, x, y, level);
      if (points.length < 2) {
        continue;
      }

      for (let i = 0; i < points.length - 1; i += 2) {
        segments.push({
          start: unproject([points[i].x, points[i].y]),
          end: unproject([points[i + 1].x, points[i + 1].y]),
          value: level,
        });
      }
    }
  }

  return segments;
}

function positionKey(position: GeoJSON.Position): string {
  return `${position[0].toFixed(6)},${position[1].toFixed(6)}`;
}

function positionsEqual(a: GeoJSON.Position, b: GeoJSON.Position): boolean {
  return positionKey(a) === positionKey(b);
}

function joinSegments(segments: Segment[]): GeoJSON.Position[][] {
  const used = new Array<boolean>(segments.length).fill(false);
  const index = new Map<string, number[]>();

  segments.forEach((segment, i) => {
    for (const position of [segment.start, segment.end]) {
      const key = positionKey(position);
      const indexes = index.get(key) ?? [];
      indexes.push(i);
      index.set(key, indexes);
    }
  });

  const takeNext = (position: GeoJSON.Position): number | undefined => {
    const indexes = index.get(positionKey(position)) ?? [];
    return indexes.find(i => !used[i]);
  };

  const paths: GeoJSON.Position[][] = [];
  for (let i = 0; i < segments.length; i++) {
    if (used[i]) {
      continue;
    }

    used[i] = true;
    const path = [segments[i].start, segments[i].end];

    let nextIndex = takeNext(path[path.length - 1]);
    while (nextIndex !== undefined) {
      used[nextIndex] = true;
      const segment = segments[nextIndex];
      const end = path[path.length - 1];
      path.push(positionsEqual(segment.start, end) ? segment.end : segment.start);
      nextIndex = takeNext(path[path.length - 1]);
    }

    nextIndex = takeNext(path[0]);
    while (nextIndex !== undefined) {
      used[nextIndex] = true;
      const segment = segments[nextIndex];
      const start = path[0];
      path.unshift(positionsEqual(segment.start, start) ? segment.end : segment.start);
      nextIndex = takeNext(path[0]);
    }

    if (path.length > 1) {
      paths.push(path);
    }
  }

  return paths;
}

function smoothPath(path: GeoJSON.Position[], iterations: number): GeoJSON.Position[] {
  let smoothed = path;
  for (let iteration = 0; iteration < iterations; iteration++) {
    if (smoothed.length < 3) {
      break;
    }

    const next: GeoJSON.Position[] = [smoothed[0]];
    for (let i = 0; i < smoothed.length - 1; i++) {
      const current = smoothed[i];
      const following = smoothed[i + 1];
      next.push([
        current[0] * 0.75 + following[0] * 0.25,
        current[1] * 0.75 + following[1] * 0.25,
      ]);
      next.push([
        current[0] * 0.25 + following[0] * 0.75,
        current[1] * 0.25 + following[1] * 0.75,
      ]);
    }
    next.push(smoothed[smoothed.length - 1]);
    smoothed = next;
  }
  return smoothed;
}

function isMajor(value: number, majorInterval: number, interval: number): boolean {
  const effectiveMajorInterval = majorInterval > interval ? majorInterval : interval;
  const ratio = value / effectiveMajorInterval;
  return Math.abs(ratio - Math.round(ratio)) < 1e-6;
}

function getReadableAngle(start: GeoJSON.Position, end: GeoJSON.Position): number {
  let angle = Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI;
  if (angle > 90) {
    angle -= 180;
  } else if (angle < -90) {
    angle += 180;
  }
  return angle;
}

function getPathLength(path: GeoJSON.Position[]): number {
  let length = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const start = path[i];
    const end = path[i + 1];
    length += Math.hypot(end[0] - start[0], end[1] - start[1]);
  }
  return length;
}

function getLabelMinZoom(pathLength: number, thresholds: LabelZoomThreshold[]): number {
  for (const [maxPathLength, minZoom] of thresholds) {
    if (pathLength < maxPathLength) {
      return minZoom;
    }
  }
  return 0;
}

function getPathLabel(path: GeoJSON.Position[], value: number, distance: number, pathLength: number, labelZoomThresholds: LabelZoomThreshold[]): LabelContourLabel | null {
  if (path.length < 2 || pathLength <= 0) {
    return null;
  }

  const targetDistance = Math.min(Math.max(distance, 0), pathLength);
  let currentDistance = 0;
  let start = path[0];
  let end = path[1];
  let ratio = 0;

  for (let i = 0; i < path.length - 1; i++) {
    start = path[i];
    end = path[i + 1];
    const segmentLength = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (currentDistance + segmentLength >= targetDistance) {
      ratio = segmentLength ? (targetDistance - currentDistance) / segmentLength : 0;
      break;
    }
    currentDistance += segmentLength;
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [
        start[0] + (end[0] - start[0]) * ratio,
        start[1] + (end[1] - start[1]) * ratio,
      ],
    },
    properties: {
      value,
      angle: getReadableAngle(start, end),
      pathLength,
      minZoom: getLabelMinZoom(pathLength, labelZoomThresholds),
    },
  };
}

function getLabels(path: GeoJSON.Position[], value: number, labelStep: number, labelZoomThresholds: LabelZoomThreshold[]): LabelContourLabel[] {
  const labels: LabelContourLabel[] = [];
  const step = Math.max(labelStep, EPSILON);
  const pathLength = getPathLength(path);
  const firstLabelDistance = pathLength / 2;
  const firstLabel = getPathLabel(path, value, firstLabelDistance, pathLength, labelZoomThresholds);
  if (firstLabel) {
    labels.push(firstLabel);
  }

  for (let distance = firstLabelDistance + step; distance < pathLength; distance += step) {
    const label = getPathLabel(path, value, distance, pathLength, labelZoomThresholds);
    if (label) {
      labels.push(label);
    }
  }
  for (let distance = firstLabelDistance - step; distance > 0; distance -= step) {
    const label = getPathLabel(path, value, distance, pathLength, labelZoomThresholds);
    if (label) {
      labels.push(label);
    }
  }
  return labels;
}

export function getLabelContourFeatures(imageProperties: ImageProperties, options: LabelContourOptions): LabelContourFeatureCollection {
  const magnitudeImage = smoothMagnitudeData(getRasterMagnitudeData(imageProperties, options.bounds), options.fieldSmoothing);
  const levels = getContourLevels(magnitudeImage.data, options.interval, options.contourValues);
  const paths: LabelContourPath[] = [];
  const labels: LabelContourLabel[] = [];

  for (const level of levels) {
    const segments = getSegments(magnitudeImage, options.bounds, level);
    const rawPaths = joinSegments(segments);
    const major = isMajor(level, options.majorInterval, options.interval);
    const shouldLabel = options.labelVisible;

    for (const rawPath of rawPaths) {
      const path = options.smooth ? smoothPath(rawPath, options.smoothIterations) : rawPath;
      if (path.length < 2) {
        continue;
      }

      paths.push({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: path,
        },
        properties: {
          value: level,
          major,
        },
      });

      if (shouldLabel) {
        labels.push(...getLabels(path, level, options.labelStep, options.labelZoomThresholds));
      }
    }
  }

  return {paths, labels};
}

export const DEFAULT_CONTOUR_LABEL_BACKGROUND_COLOR: Color = [207, 255, 255, 230];
