import {CompositeLayer} from '@deck.gl/core';
import type {Position, Color, LayerProps, DefaultProps, CompositeLayerProps, UpdateParameters, LayersList, FilterContext} from '@deck.gl/core';
import {PathLayer, TextLayer} from '@deck.gl/layers';
import type {PathLayerProps, TextLayerProps, BitmapBoundingBox} from '@deck.gl/layers';
import {DEFAULT_LINE_WIDTH, DEFAULT_LINE_COLOR, DEFAULT_TEXT_FORMAT_FUNCTION, DEFAULT_TEXT_FONT_FAMILY, DEFAULT_TEXT_SIZE, DEFAULT_TEXT_COLOR, DEFAULT_TEXT_OUTLINE_WIDTH, DEFAULT_TEXT_OUTLINE_COLOR, ensureDefaultProps} from '../../_utils/props.js';
import type {TextFormatFunction} from '../../_utils/props.js';
import type {TextureData} from '../../_utils/texture-data.js';
import {ImageInterpolation} from '../../_utils/image-interpolation.js';
import {ImageType} from '../../_utils/image-type.js';
import type {ImageUnscale} from '../../_utils/image-unscale.js';
import type {UnitFormat} from '../../_utils/unit-format.js';
import {formatValue} from '../../_utils/format.js';
import {isViewportInZoomBounds, getViewportAngle, getViewportZoom} from '../../_utils/viewport.js';
import type {Palette} from '../../_utils/palette.js';
import {parsePalette, type Scale} from '../../_utils/palette.js';
import {paletteColorToGl} from '../../_utils/color.js';
import {DEFAULT_CONTOUR_LABEL_BACKGROUND_COLOR, DEFAULT_LABEL_ZOOM_THRESHOLDS, getLabelContourFeatures} from './my-contour-data.js';
import type {LabelContourLabel, LabelContourPath, LabelZoomThreshold} from './my-contour-data.js';

function getPathPositions(path: LabelContourPath): Position[] {
  return path.geometry.coordinates.map(position => [position[0], position[1]] as Position);
}

function formatContourLabel(value: number, unitFormat: UnitFormat | null, textFormatFunction: TextFormatFunction): string {
  if (typeof textFormatFunction === 'function') {
    return textFormatFunction(value, unitFormat);
  }
  return formatValue(value, unitFormat);
}

type _LabelContourLayerProps = CompositeLayerProps & {
  image: TextureData | null;
  image2: TextureData | null;
  imageSmoothing: number;
  imageInterpolation: ImageInterpolation;
  imageWeight: number;
  imageType: ImageType;
  imageUnscale: ImageUnscale;
  imageMinValue: number | null;
  imageMaxValue: number | null;
  bounds: BitmapBoundingBox;
  minZoom: number | null;
  maxZoom: number | null;

  interval: number;
  majorInterval: number;
  contourValues: number[] | null;
  fieldSmoothing: number;
  smooth: boolean;
  smoothIterations: number;
  width: number;
  color: Color;
  palette: Palette | null;

  labelVisible: boolean;
  labelStep: number;
  labelZoomThresholds: LabelZoomThreshold[];
  labelBackground: boolean;
  labelBackgroundColor: Color;
  labelBackgroundPadding: [number, number, number, number];
  unitFormat: UnitFormat | null;
  textFormatFunction: TextFormatFunction;
  textFontFamily: string;
  textSize: number;
  textColor: Color;
  textOutlineWidth: number;
  textOutlineColor: Color;
}

export type LabelContourLayerProps = _LabelContourLayerProps & LayerProps;

const defaultProps: DefaultProps<LabelContourLayerProps> = {
  image: {type: 'object', value: null},
  image2: {type: 'object', value: null},
  imageSmoothing: {type: 'number', value: 0},
  imageInterpolation: {type: 'object', value: ImageInterpolation.CUBIC},
  imageWeight: {type: 'number', value: 0},
  imageType: {type: 'object', value: ImageType.SCALAR},
  imageUnscale: {type: 'array', value: null},
  imageMinValue: {type: 'object', value: null},
  imageMaxValue: {type: 'object', value: null},
  bounds: {type: 'array', value: [-180, -90, 180, 90], compare: true},
  minZoom: {type: 'object', value: null},
  maxZoom: {type: 'object', value: null},

  interval: {type: 'number', value: 0},
  majorInterval: {type: 'number', value: 0},
  contourValues: {type: 'array', value: null, compare: true},
  fieldSmoothing: {type: 'number', value: 2},
  smooth: {type: 'boolean', value: true},
  smoothIterations: {type: 'number', value: 2},
  width: {type: 'number', value: DEFAULT_LINE_WIDTH},
  color: {type: 'color', value: DEFAULT_LINE_COLOR},
  palette: {type: 'object', value: null},

  labelVisible: {type: 'boolean', value: true},
  labelStep: {type: 'number', value: 180},
  labelZoomThresholds: {type: 'array', value: DEFAULT_LABEL_ZOOM_THRESHOLDS, compare: true},
  labelBackground: {type: 'boolean', value: true},
  labelBackgroundColor: {type: 'color', value: DEFAULT_CONTOUR_LABEL_BACKGROUND_COLOR},
  labelBackgroundPadding: {type: 'array', value: [3, 2, 3, 2], compare: true},
  unitFormat: {type: 'object', value: null},
  textFormatFunction: {type: 'function', value: DEFAULT_TEXT_FORMAT_FUNCTION},
  textFontFamily: {type: 'object', value: DEFAULT_TEXT_FONT_FAMILY},
  textSize: {type: 'number', value: DEFAULT_TEXT_SIZE},
  textColor: {type: 'color', value: DEFAULT_TEXT_COLOR},
  textOutlineWidth: {type: 'number', value: DEFAULT_TEXT_OUTLINE_WIDTH},
  textOutlineColor: {type: 'color', value: DEFAULT_TEXT_OUTLINE_COLOR},
};

export class LabelContourLayer<ExtraPropsT extends {} = {}> extends CompositeLayer<ExtraPropsT & Required<_LabelContourLayerProps>> {
  static layerName = 'LabelContourLayer';
  static defaultProps = defaultProps;

  declare state: CompositeLayer['state'] & {
    props?: LabelContourLayerProps;
    paths?: LabelContourPath[];
    labels?: LabelContourLabel[];
    paletteScale?: Scale;
  };

  renderLayers(): LayersList {
    const {viewport} = this.context;
    const {props, paths, labels, paletteScale} = this.state;
    if (!props || !paths) {
      return [];
    }

    const {minZoom, maxZoom, width, color, labelVisible, labelBackground, labelBackgroundColor, labelBackgroundPadding, unitFormat, textFormatFunction, textFontFamily, textSize, textColor, textOutlineWidth, textOutlineColor} = ensureDefaultProps(props, defaultProps);
    const visibleLabels = labels?.filter(label => getViewportZoom(viewport) >= label.properties.minZoom);

    return [
      new PathLayer(this.getSubLayerProps({
        id: 'path',
        data: paths,
        getPath: getPathPositions,
        getWidth: d => d.properties.major ? width : width / 2,
        getColor: d => paletteScale ? paletteColorToGl(paletteScale(d.properties.value).rgba()) : color,
        widthUnits: 'pixels',
        jointRounded: true,
        capRounded: true,
        parameters: {
          cullMode: 'back',
          depthCompare: 'always',
          ...this.props.parameters,
        },
      } satisfies PathLayerProps<LabelContourPath>)),
      labelVisible && visibleLabels && isViewportInZoomBounds(viewport, minZoom, maxZoom) && new TextLayer(this.getSubLayerProps({
        id: 'label',
        data: visibleLabels,
        getPosition: d => d.geometry.coordinates as [number, number] as Position,
        getText: d => formatContourLabel(d.properties.value, unitFormat, textFormatFunction),
        getAngle: d => getViewportAngle(viewport, d.properties.angle),
        getSize: textSize,
        getColor: textColor,
        outlineWidth: textOutlineWidth,
        outlineColor: textOutlineColor,
        fontFamily: textFontFamily,
        fontSettings: {sdf: true},
        billboard: false,

        background: labelBackground,
        getBackgroundColor: labelBackgroundColor,
        backgroundPadding: labelBackgroundPadding,

        parameters: {
          depthCompare: 'always',
          ...this.props.parameters,
        },
      } satisfies TextLayerProps<LabelContourLabel>)),
    ];
  }

  filterSubLayer(params: FilterContext): boolean {
    const {viewport} = params;
    const {minZoom, maxZoom} = ensureDefaultProps(this.props, defaultProps);
    return isViewportInZoomBounds(viewport, minZoom, maxZoom);
  }

  shouldUpdateState(params: UpdateParameters<this>): boolean {
    return super.shouldUpdateState(params) || params.changeFlags.viewportChanged;
  }

  updateState(params: UpdateParameters<this>): void {
    const {image, image2, imageSmoothing, imageInterpolation, imageWeight, imageType, imageUnscale, imageMinValue, imageMaxValue, bounds, interval, majorInterval, contourValues, fieldSmoothing, smooth, smoothIterations, labelVisible, labelStep, labelZoomThresholds, palette, visible} = params.props;

    super.updateState(params);

    if (image && imageUnscale && !(image.data instanceof Uint8Array || image.data instanceof Uint8ClampedArray)) {
      throw new Error('imageUnscale can be applied to Uint8 data only');
    }

    if (!visible || !image || !interval) {
      this.setState({
        paths: undefined,
        labels: undefined,
      });
    } else if (
      image !== params.oldProps.image ||
      image2 !== params.oldProps.image2 ||
      imageSmoothing !== params.oldProps.imageSmoothing ||
      imageInterpolation !== params.oldProps.imageInterpolation ||
      imageWeight !== params.oldProps.imageWeight ||
      imageType !== params.oldProps.imageType ||
      imageUnscale !== params.oldProps.imageUnscale ||
      imageMinValue !== params.oldProps.imageMinValue ||
      imageMaxValue !== params.oldProps.imageMaxValue ||
      bounds !== params.oldProps.bounds ||
      interval !== params.oldProps.interval ||
      majorInterval !== params.oldProps.majorInterval ||
      contourValues !== params.oldProps.contourValues ||
      fieldSmoothing !== params.oldProps.fieldSmoothing ||
      smooth !== params.oldProps.smooth ||
      smoothIterations !== params.oldProps.smoothIterations ||
      labelVisible !== params.oldProps.labelVisible ||
      labelStep !== params.oldProps.labelStep ||
      labelZoomThresholds !== params.oldProps.labelZoomThresholds ||
      visible !== params.oldProps.visible
    ) {
      this._updateFeatures();
    }

    if (palette !== params.oldProps.palette) {
      this._updatePalette();
    }

    this.setState({props: params.props});
  }

  private _updateFeatures(): void {
    const {image, image2, imageSmoothing, imageInterpolation, imageWeight, imageType, imageUnscale, imageMinValue, imageMaxValue, bounds, interval, majorInterval, contourValues, fieldSmoothing, smooth, smoothIterations, labelVisible, labelStep, labelZoomThresholds} = ensureDefaultProps(this.props, defaultProps);
    if (!image || !interval) {
      return;
    }

    const imageProperties = {image, image2, imageSmoothing, imageInterpolation, imageWeight, imageType, imageUnscale, imageMinValue, imageMaxValue};
    const {paths, labels} = getLabelContourFeatures(imageProperties, {
      bounds: bounds as GeoJSON.BBox,
      interval,
      majorInterval,
      contourValues,
      fieldSmoothing,
      smooth,
      smoothIterations,
      labelVisible,
      labelStep,
      labelZoomThresholds,
    });

    this.setState({paths, labels});
  }

  private _updatePalette(): void {
    const {palette} = ensureDefaultProps(this.props, defaultProps);
    if (!palette) {
      this.setState({paletteScale: undefined});
      return;
    }

    this.setState({paletteScale: parsePalette(palette)});
  }
}

export {LabelContourLayer as MyContourLayer};
export type {LabelContourLayerProps as MyContourLayerProps};
