# WeatherLayers GL Reference

## Core Summary

WeatherLayers GL is a high-performance interactive weather visualization library built as
deck.gl layers plus standalone DOM controls. It can use self-hosted data or WeatherLayers Cloud
data. It supports major map integrations through deck.gl, including MapLibre and Mapbox
interleaved modes.

Install with `npm install weatherlayers-gl` and import with:

```ts
import * as WeatherLayers from "weatherlayers-gl";
```

Recent compatibility from the local docs:

- WeatherLayers GL `2026.5.0-latest`: deck.gl 9.3.
- WeatherLayers GL `2025.11.0-2026.2.0`: deck.gl 9.2.
- WeatherLayers GL `2025.1.0-2025.8.0`: deck.gl 9.1.
- WeatherLayers GL `2024.4.0-2024.9.1`: deck.gl 9.0.

Peer dependencies include deck.gl, luma.gl, optional geotiff.js for GeoTIFF loading,
MapLibre GL JS, and Mapbox GL JS. Current docs say no license file is required for production use.

## Data Rules

Supported projection:

- EPSG:4326 equirectangular.

Supported data types:

- `Uint8`: quantized values, smaller files, good for visualization. Use `imageUnscale`.
- `Float32`: original values, larger files, best for scientific precision and accurate picking.

Supported formats:

- PNG/WebP `Uint8` scalar: R channel, nodata where A is 0.
- PNG/WebP `Uint8` vector: RG channels for U/V, nodata where A is 0.
- GeoTIFF `Uint8` scalar: band 1, nodata where band 2 is 0.
- GeoTIFF `Uint8` vector: bands 1 and 2, nodata where band 4 is 0.
- GeoTIFF `Float32` scalar: band 1, nodata as `NaN`.
- GeoTIFF `Float32` vector: bands 1 and 2, nodata as `NaN`.

`TextureData`:

```ts
interface TextureData {
  data: Uint8Array | Uint8ClampedArray | Float32Array;
  width: number;
  height: number;
}
```

For custom decoded multi-band data, use band-interleaved-by-pixel order:
`[u1, v1, u2, v2, ...]`.

Common data props:

- `image`: required `TextureData`.
- `image2`: optional subsequent `TextureData` for interpolation.
- `imageSmoothing`: default `0`.
- `imageInterpolation`: `NEAREST`, `LINEAR`, or `CUBIC`; default `CUBIC`.
- `imageWeight`: `0-1`, default `0`.
- `imageType`: `SCALAR` or `VECTOR`.
- `imageUnscale`: `[min, max]` or `null`; use with `Uint8` quantized data.
- `imageMinValue`, `imageMaxValue`: optional render limits in image data units.
- `bounds`: required `[minX, minY, maxX, maxY]`; global default is `[-180, -90, 180, 90]`.
- `minZoom`: optional `0-20`.
- `maxZoom`: default `10` for `ContourLayer`, `15` for `ParticleLayer`, otherwise no limit.

Global WebMercator clipping:

```ts
import { ClipExtension } from "@deck.gl/extensions";

{
  extensions: [new ClipExtension()],
  clipBounds: [-181, -85.051129, 181, 85.051129],
}
```

## Loading and Utility Functions

- `setLibrary<T>(name, library)`: set an optional dependency when dynamic import is not supported.
- `loadTextureData(url, options?)`: load PNG, WebP, or GeoTIFF as `TextureData`.
- `loadJson(url, options?)`: load JSON.
- `LoadOptions`: `{ headers?: Record<string,string>; signal?: AbortSignal }`.
- `CachedLoadOptions<T>`: load options plus `cache?: Map<string, T | Promise<T>> | false`.
- `getClosestStartDatetime(datetimes, datetime)`: lower/equal time for `image`.
- `getClosestEndDatetime(datetimes, datetime)`: greater/equal time for `image2`.
- `getDatetimeWeight(startDatetime, endDatetime, datetime)`: `0-1` interpolation weight.
- `offsetDatetime(datetime, hour)`: add hours.
- `offsetDatetimeRange(datetime, startHour, endHour)`: return a datetime range.
- `getRasterPoints(imageProperties, bounds, positions)`: return point values for positions.

## Layer Selection

### RasterLayer

Use for scalar variable color overlays. Required style prop:

- `palette`: color palette text or `[number, PaletteColor][]`.

Optional:

- `gridEnabled`: verify alignment by showing data grid points.
- `pickable: true`: picking info adds `event.raster` with `{ value, direction? }`.

### ContourLayer

Use for scalar contour lines. Props:

- `interval`: required contour interval in data units.
- `majorInterval`: default `0`, interval between major lines.
- `width`: default `1`.
- `color`: default `[255, 255, 255]`.
- `palette`: optional color palette.

For byte data, prefer `imageInterpolation: WeatherLayers.ImageInterpolation.CUBIC`.

### LabelContourLayer

Use for scalar contour lines with value labels in this fork. This layer is not part of the
original upstream docs; it is implemented in `src/deck/layers/my-contour-layer/`.
Public class: `WeatherLayers.LabelContourLayer`. The old `MyContourLayer` name remains as
an alias for compatibility.

Core props:

- `interval`: required contour interval in data units.
- `majorInterval`: interval between major lines.
- `contourValues`: optional explicit contour levels.
- `fieldSmoothing`: number of scalar-field smoothing passes before extracting contours.
- `smooth`: enable/disable contour path smoothing.
- `smoothIterations`: number of path smoothing passes.
- `width`: contour line width in pixels.
- `color`: contour line color when no palette is supplied.
- `palette`: optional color palette by contour value.
- `labelVisible`: show/hide labels.
- `labelStep`: distance between extra labels on long contour paths.
- `labelZoomThresholds`: ordered `[maxPathLength, minZoom]` rules.
- `labelBackground`, `labelBackgroundColor`, `labelBackgroundPadding`.
- `unitFormat`, `textFormatFunction`, `textFontFamily`, `textSize`, `textColor`,
  `textOutlineWidth`, `textOutlineColor`.

Default label thresholds:

```ts
[[2, 9], [5, 7], [10, 5]]
```

Rules are checked in order. If a label's contour path length is below `maxPathLength`,
the label appears at `minZoom`. Labels that do not match any threshold appear from zoom `0`.
With the default thresholds, zoom `9` shows all generated labels.

Example:

```ts
new WeatherLayers.LabelContourLayer({
  id: "labelContour",
  image,
  bounds: [-180, -90, 180, 90],
  imageType: WeatherLayers.ImageType.SCALAR,
  imageUnscale: [300, 600],
  imageInterpolation: WeatherLayers.ImageInterpolation.CUBIC,
  interval: 26,
  majorInterval: 52,
  fieldSmoothing: 6,
  smooth: true,
  smoothIterations: 3,
  width: 1.8,
  color: [185, 246, 255, 230],
  labelVisible: true,
  labelStep: 45,
  labelZoomThresholds: [[2, 9], [5, 7], [10, 5]],
  labelBackground: true,
  labelBackgroundColor: [210, 255, 255, 235],
  textSize: 13,
});
```

Implementation notes:

- Labels are generated from the smoothed contour path.
- Every generated contour path gets at least one label when `labelVisible` is true.
- `labelInterval` is intentionally not supported; labels are generated for all contour intervals.
- The local demo is `docs/test/my-contour-maplibre.html`.

### ParticleLayer

Use for animated vector flow. Data should be `VECTOR`. Props:

- `numParticles`: default `5000`; current versions round to a multiple of 4 for GPU compatibility.
- `maxAge`: default `100` frames.
- `speedFactor`: default `1`, range `0-1`.
- `width`: default `1`.
- `color`: default `[255, 255, 255]`.
- `palette`: optional palette by value.

### GridLayer

Use for values, arrows, or wind barbs. Props:

- `style`: `WeatherLayers.GridStyle.VALUE`, `ARROW`, or `WIND_BARB`; default `VALUE`.
- `density`: recommended `-2`, `-1`, `0`, `1`, or `2`; high values may hurt performance.
- `unitFormat`: optional `{ unit, scale?, offset?, decimals? }`.
- `textFormatFunction`: optional `(value, unitFormat) => string`.
- `textFontFamily`, `textSize`, `textColor`, `textOutlineWidth`, `textOutlineColor`.
- `iconBounds`: required for arrows; default for wind barbs is `[0, 100 * 0.51444]`.
- `iconSize`: number or `[min, max]`.
- `iconColor`: icon color.
- `palette`: optional palette.

For arrows or wind barbs, set `imageType: WeatherLayers.ImageType.VECTOR`.
For wind barbs, `iconBounds[1]` must match 100 knots in the source data units.

### HighLowLayer

Use for local highs/lows. Props:

- `radius`: required radius in km; larger values detect fewer highs/lows.
- Text props and `unitFormat` match `GridLayer`.
- `palette`: optional.

### FrontLayer

Use for front line paths, not raster image data. Data objects can be any shape when accessors map them:

```ts
new WeatherLayers.FrontLayer({
  data: frontData,
  getType: d => d.type,
  getPath: d => d.path,
  coldColor: [37, 99, 235],
  warmColor: [220, 38, 38],
  occludedColor: [124, 58, 237],
});
```

Props:

- `getType(d) => WeatherLayers.FrontType`.
- `getPath(d) => [number, number][]`.
- `width`: default `2`.
- `coldColor`, `warmColor`, `occludedColor`.

## Controls

All controls inherit:

- `addTo(target)`, `prependTo(target)`, `remove()`, `setConfig(config)`.

### LegendControl

Use beside a raster-like layer:

```ts
new WeatherLayers.LegendControl({
  title: "Wind",
  unitFormat: { unit: "m/s" },
  palette,
}).addTo(document.getElementById("controls"));
```

Props: `width` default `300`, `ticksCount` default `6`, required `title`,
required `unitFormat`, required `palette`.

### TimelineControl

Use for animation and time interpolation. Props:

- `width`: default `300`.
- `datetimes`: required ISO datetime array.
- `datetimeInterpolate`: default `true`.
- `datetime`: required selected datetime.
- `onPreload(datetimes)`: optional preloader.
- `onUpdate(datetime)`: optional update callback.
- `fps`: default `15`.

Methods: `toggle`, `start`, `pause`, `stop`, `reset`, `stepBackward`, `stepForward`.
Starting and stepping await `onPreload`.

### TooltipControl

Use with `pickable: true` layers:

```ts
const tooltip = new WeatherLayers.TooltipControl({
  unitFormat: { unit: "m/s" },
  directionFormat: WeatherLayers.DirectionFormat.CARDINAL3,
  followCursor: true,
});

tooltip.addTo(deckgl.getCanvas().parentElement);
deckgl.setProps({ onHover: event => tooltip.updatePickingInfo(event) });
```

Props:

- `unitFormat`: required.
- `directionType`: default `INWARD`; use `OUTWARD` for currents-like outward direction.
- `directionFormat`: `VALUE`, `CARDINAL`, `CARDINAL2`, `CARDINAL3`.
- `followCursor`: default `false`.
- `followCursorOffset`: default `16`.
- `followCursorPlacement`: `BOTTOM`, `TOP`, `RIGHT`, `LEFT`.

Methods: `update(rasterPointProperties)` and `updatePickingInfo(pickingInfo)`.

### AttributionControl and LogoControl

Use `AttributionControl({ attribution })` to show data producer text. Use `LogoControl()` to show
the WeatherLayers logo.

## Types

Important enums and types:

- `ImageInterpolation`: `NEAREST`, `LINEAR`, `CUBIC`.
- `ImageType`: `SCALAR`, `VECTOR`.
- `ImageUnscale`: `[min, max] | null`.
- `DirectionType`: `INWARD`, `OUTWARD`.
- `DirectionFormat`: `VALUE`, `CARDINAL`, `CARDINAL2`, `CARDINAL3`.
- `Placement`: `BOTTOM`, `TOP`, `RIGHT`, `LEFT`.
- `UnitFormat`: `{ unit: string; scale?: number; offset?: number; decimals?: number }`.
- `RasterPointProperties`: `{ value: number; direction?: number }`.
- Datetime strings are ISO 8601 strings.

## Data Transformation Examples

Use GDAL on backend systems to convert NetCDF/GRIB into supported images.

Temperature GRIB to PNG, scaling Kelvin data `[213.15, 325.15]` to `[0, 255]`:

```sh
gdal_translate -ot Byte -scale 213.15 325.15 0 255 --config GRIB_NORMALIZE_UNITS=NO temperature.grib temperature.png
```

Then configure:

```ts
{
  imageType: WeatherLayers.ImageType.SCALAR,
  imageUnscale: [213.15, 325.15],
}
```

Wind GRIB U/V to PNG:

```sh
gdalbuildvrt -separate wind.vrt wind_u.grib wind_v.grib wind_v.grib
gdal_translate -ot Byte -scale -128 127 0 255 wind.vrt wind.png
```

Then configure:

```ts
{
  imageType: WeatherLayers.ImageType.VECTOR,
  imageUnscale: [-128, 127],
}
```

## Troubleshooting

- If no layer displays and the browser logs unresolved deck.gl shader hooks, ensure the app uses
  one deck.gl bundle only. Avoid mixed versions or ESM/CJS duplicates.
- If MapLibre/Mapbox interleaved layers cannot be re-enabled after removing an overlay, clear
  layers with `overlay.setProps({ layers: [] })` before removal and set fresh layers after adding.
- If `HighLowLayer` does not display in interleaved mode, use deck.gl 9.2.6+ and
  `_renderLayersInGroups: true` in `MapboxOverlay`.
- For older deck.gl versions, place `HighLowLayer` before bitmap layers and use polygon offset as
  a workaround.
