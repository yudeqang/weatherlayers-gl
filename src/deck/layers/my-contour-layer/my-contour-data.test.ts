import assert from 'node:assert';
import test from 'node:test';

import {ImageInterpolation} from '../../_utils/image-interpolation.js';
import {ImageType} from '../../_utils/image-type.js';
import {DEFAULT_LABEL_ZOOM_THRESHOLDS, getLabelContourFeatures} from './my-contour-data.js';

test('getMyContourFeatures', () => {
  const image = {
    width: 5,
    height: 5,
    data: new Float32Array([
      0, 1, 2, 3, 4,
      1, 2, 3, 4, 5,
      2, 3, 4, 5, 6,
      3, 4, 5, 6, 7,
      4, 5, 6, 7, 8,
    ]),
  };

  const features = getLabelContourFeatures({
    image,
    image2: null,
    imageSmoothing: 0,
    imageInterpolation: ImageInterpolation.NEAREST,
    imageWeight: 0,
    imageType: ImageType.SCALAR,
    imageUnscale: null,
    imageMinValue: null,
    imageMaxValue: null,
  }, {
    bounds: [0, 0, 4, 4],
    interval: 1,
    majorInterval: 2,
    contourValues: [4],
    fieldSmoothing: 0,
    smooth: false,
    smoothIterations: 0,
    labelVisible: true,
    labelStep: 1,
    labelZoomThresholds: DEFAULT_LABEL_ZOOM_THRESHOLDS,
  });

  assert.ok(features.paths.length > 0);
  assert.ok(features.labels.length > 0);
  assert.ok(features.paths.every(path => path.properties.value === 4));
  assert.ok(features.labels.every(label => label.properties.value === 4));
  assert.ok(features.paths.every(path => path.geometry.coordinates.every(position => (
    position[0] >= 0 &&
    position[0] <= 4 &&
    position[1] >= 0 &&
    position[1] <= 4
  ))));
});

test('getMyContourFeatures labels every contour path by default', () => {
  const image = {
    width: 5,
    height: 5,
    data: new Float32Array([
      0, 1, 2, 3, 4,
      1, 2, 3, 4, 5,
      2, 3, 4, 5, 6,
      3, 4, 5, 6, 7,
      4, 5, 6, 7, 8,
    ]),
  };

  const features = getLabelContourFeatures({
    image,
    image2: null,
    imageSmoothing: 0,
    imageInterpolation: ImageInterpolation.NEAREST,
    imageWeight: 0,
    imageType: ImageType.SCALAR,
    imageUnscale: null,
    imageMinValue: null,
    imageMaxValue: null,
  }, {
    bounds: [0, 0, 4, 4],
    interval: 1,
    majorInterval: 2,
    contourValues: [3],
    fieldSmoothing: 0,
    smooth: false,
    smoothIterations: 0,
    labelVisible: true,
    labelStep: 100,
    labelZoomThresholds: DEFAULT_LABEL_ZOOM_THRESHOLDS,
  });

  assert.ok(features.paths.length > 0);
  assert.ok(features.labels.length >= features.paths.length);
  assert.ok(features.labels.every(label => label.properties.value === 3));
  assert.ok(features.labels.every(label => typeof label.properties.minZoom === 'number'));
  assert.ok(features.labels.every(label => label.properties.minZoom <= 9));
});

test('getLabelContourFeatures uses custom label zoom thresholds', () => {
  const image = {
    width: 5,
    height: 5,
    data: new Float32Array([
      0, 1, 2, 3, 4,
      1, 2, 3, 4, 5,
      2, 3, 4, 5, 6,
      3, 4, 5, 6, 7,
      4, 5, 6, 7, 8,
    ]),
  };

  const features = getLabelContourFeatures({
    image,
    image2: null,
    imageSmoothing: 0,
    imageInterpolation: ImageInterpolation.NEAREST,
    imageWeight: 0,
    imageType: ImageType.SCALAR,
    imageUnscale: null,
    imageMinValue: null,
    imageMaxValue: null,
  }, {
    bounds: [0, 0, 4, 4],
    interval: 1,
    majorInterval: 2,
    contourValues: [3],
    fieldSmoothing: 0,
    smooth: false,
    smoothIterations: 0,
    labelVisible: true,
    labelStep: 100,
    labelZoomThresholds: [[100, 4]],
  });

  assert.ok(features.labels.length > 0);
  assert.ok(features.labels.every(label => label.properties.minZoom === 4));
});
