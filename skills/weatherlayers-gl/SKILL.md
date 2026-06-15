---
name: weatherlayers-gl
description: Build or troubleshoot WeatherLayers GL visualizations, including RasterLayer, ContourLayer, LabelContourLayer/labelContour, ParticleLayer, GridLayer, HighLowLayer, FrontLayer, controls, MapLibre/deck.gl overlays, and custom weather raster/vector data.
---

# WeatherLayers GL

Use this skill for `weatherlayers-gl` weather map work: data loading, deck.gl layers,
MapLibre/Mapbox overlays, controls, legends, labels, animations, and local demos.

For exact layer/control props, data format rules, compatibility notes, and the full
`LabelContourLayer` API, read `references/weatherlayers-gl-reference.md`.

## Install This Skill

From this repository, copy `skills/weatherlayers-gl` to
`%USERPROFILE%\.codex\skills\weatherlayers-gl`, then start a new Codex
thread/session so the skill metadata is reloaded.

## Core Setup

```js
import * as WeatherLayers from "weatherlayers-gl";

const image = await WeatherLayers.loadTextureData(url);
```

Common data props:

- `image`: loaded PNG/WebP/GeoTIFF texture data or `{data, width, height}`.
- `image2` and `imageWeight`: interpolate between two time steps.
- `imageType`: `ImageType.SCALAR` for one variable, `ImageType.VECTOR` for U/V.
- `imageUnscale`: convert byte data to real units, for example `[300, 600]`.
- `bounds`: usually `[-180, -90, 180, 90]` for global EPSG:4326 data.
- `imageInterpolation`: prefer `ImageInterpolation.CUBIC` for smooth meteorological rasters.
- For WebMercator global data, use clipping around `[-181, -85.051129, 181, 85.051129]` when needed.

## Layer Choice

- `RasterLayer`: scalar color overlay such as temperature, pressure, cloud cover, height.
- `ContourLayer`: scalar isolines without text labels.
- `LabelContourLayer`: fork-added Windy-style contour lines with value labels.
- `ParticleLayer`: animated vector flow for wind, waves, currents.
- `GridLayer`: sampled values, arrows, or wind barbs on a grid.
- `HighLowLayer`: local high/low markers from scalar fields.
- `FrontLayer`: weather front paths: cold, warm, occluded, stationary.

## RasterLayer

Use for continuous scalar color fields.

```js
new WeatherLayers.RasterLayer({
  id: "temperature",
  image,
  bounds: [-180, -90, 180, 90],
  imageType: WeatherLayers.ImageType.SCALAR,
  imageUnscale: [213.15, 325.15],
  imageInterpolation: WeatherLayers.ImageInterpolation.CUBIC,
  palette: [
    [240, [36, 99, 235]],
    [280, [34, 197, 94]],
    [310, [220, 38, 38]],
  ],
  opacity: 0.65,
  pickable: true,
});
```

Pair `RasterLayer` with `LegendControl` using the same `palette` and `unitFormat`.

## ContourLayer

Use for isolines when no text labels are required.

```js
new WeatherLayers.ContourLayer({
  id: "contour",
  image,
  bounds: [-180, -90, 180, 90],
  imageType: WeatherLayers.ImageType.SCALAR,
  imageUnscale: [300, 600],
  interval: 26,
  majorInterval: 52,
  width: 1.5,
});
```

`interval` controls isoline spacing. `majorInterval` controls emphasized lines.

## LabelContourLayer

Use this fork-added layer for Windy-style contour lines with value labels.
Public class: `WeatherLayers.LabelContourLayer`. Recommended layer id: `labelContour`.
`MyContourLayer` remains only as a backwards-compatible alias.

```js
new WeatherLayers.LabelContourLayer({
  id: "labelContour",
  image,
  bounds: [-180, -90, 180, 90],
  imageType: WeatherLayers.ImageType.SCALAR,
  imageUnscale: [300, 600],
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

Label rules:

- Labels are generated for all contour intervals when `labelVisible` is true.
- Every generated contour path gets at least one label.
- `fieldSmoothing` smooths the scalar field before contour extraction.
- `smoothIterations` smooths generated contour paths.
- `labelStep` adds extra labels along long paths.
- `labelZoomThresholds` is an ordered list of `[maxPathLength, minZoom]`.
- Default `labelZoomThresholds` is `[[2, 9], [5, 7], [10, 5]]`, so zoom `9` shows all generated labels.

## ParticleLayer

Use for animated vector fields.

```js
new WeatherLayers.ParticleLayer({
  id: "wind",
  image,
  bounds: [-180, -90, 180, 90],
  imageType: WeatherLayers.ImageType.VECTOR,
  imageUnscale: [-50, 50],
  numParticles: 5000,
  speedFactor: 1,
  width: 1,
});
```

Set `imageType: ImageType.VECTOR` before using particles.

## GridLayer

Use for sampled values, arrows, or wind barbs.

```js
new WeatherLayers.GridLayer({
  id: "wind-grid",
  image,
  bounds: [-180, -90, 180, 90],
  imageType: WeatherLayers.ImageType.VECTOR,
  imageUnscale: [-50, 50],
  style: WeatherLayers.GridStyle.WIND_BARB,
  radius: 24,
});
```

Use scalar data for value labels and vector data for arrows/barbs.

## HighLowLayer

Use for local highs and lows in scalar fields.

```js
new WeatherLayers.HighLowLayer({
  id: "pressure-high-low",
  image,
  bounds: [-180, -90, 180, 90],
  imageType: WeatherLayers.ImageType.SCALAR,
  imageUnscale: [900, 1100],
  radius: 48,
  textSize: 18,
});
```

In MapLibre/Mapbox interleaved mode, prefer deck.gl 9.2.6+ and `_renderLayersInGroups: true`.

## FrontLayer

Use for explicit weather front geometries.

```js
new WeatherLayers.FrontLayer({
  id: "fronts",
  data: fronts,
  getPath: d => d.path,
  getType: d => d.type,
  width: 4,
});
```

Front types include cold, warm, occluded, and stationary fronts.

## Controls

- `LegendControl`: color ramp and ticks for raster-like scalar layers.
- `TooltipControl`: values/directions from pickable weather layers.
- `TimelineControl`: timeline and preload flow for time-stepped data.
- `LogoControl` and `AttributionControl`: branding and attribution.

```js
map.addControl(new WeatherLayers.LegendControl({
  title: "Height",
  unitFormat: {unit: "m"},
  palette,
}), "bottom-right");
```

## Local Test Page

This fork's local MapLibre page is:

```text
docs/test/my-contour-maplibre.html
```

It uses `docs/test/data.byte.webp` and `dist/weatherlayers-deck.umd.min.js`.
After TypeScript changes, run Rollup before expecting the browser page to change.

## Common Pitfalls

- Ensure only one deck.gl bundle/version is loaded.
- Hard refresh the browser after rebuilding `dist`.
- Keep `imageUnscale`, `interval`, `palette`, and `unitFormat` in the same units.
- Use `ImageInterpolation.CUBIC` for smoother byte-data weather contours.
- Do not use `labelInterval` with `LabelContourLayer`; labels are generated for all contour intervals.
