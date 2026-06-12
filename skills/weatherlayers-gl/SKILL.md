---
name: weatherlayers-gl
description: Build or troubleshoot weather map visualizations with the WeatherLayers GL JavaScript library, including labelContour contour labels and MapLibre/deck.gl demos.
---

# WeatherLayers GL

Use this skill to implement or debug interactive weather visualizations with `weatherlayers-gl`.
WeatherLayers GL provides deck.gl layers and DOM controls for raster overlays, contour lines,
particle animations, gridded values/icons, high/low labels, weather fronts, legends, timelines,
tooltips, logos, and attribution.

For this project fork, use `LabelContourLayer` for Windy-style labeled contour lines.
The legacy `MyContourLayer` export is kept only as a compatibility alias.

## Quick Start

```js
import * as WeatherLayers from "weatherlayers-gl";

const layer = new WeatherLayers.LabelContourLayer({
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
  labelStep: 45,
  labelZoomThresholds: [[2, 9], [5, 7], [10, 5]],
});
```

## Layer Choice

- Use `RasterLayer` for scalar color overlays.
- Use `ContourLayer` for scalar isolines without built-in labels.
- Use `LabelContourLayer` for scalar isolines with value labels.
- Use `ParticleLayer` for animated vector flow such as wind, waves, or currents.
- Use `GridLayer` for values, arrows, or wind barbs.
- Use `HighLowLayer` for local highs and lows.
- Use `FrontLayer` for cold, warm, occluded, or stationary front paths.

## labelContour Rules

- Public class: `WeatherLayers.LabelContourLayer`.
- Recommended layer id: `labelContour`.
- The layer computes contour paths from scalar raster data, smooths the scalar field with `fieldSmoothing`, optionally smooths the contour path with `smoothIterations`, and creates labels from the smoothed path.
- Every generated contour path gets at least one label when `labelVisible` is true.
- `labelStep` controls extra labels along the same contour path.
- `labelZoomThresholds` controls when short contour labels appear.

Default thresholds:

```js
[[2, 9], [5, 7], [10, 5]]
```

Each threshold is `[maxPathLength, minZoom]`, checked in order. A label whose path length is below
`maxPathLength` appears at `minZoom`; labels that do not match any threshold appear at zoom `0`.
With the default thresholds, zoom `9` shows all generated labels.

## Data Loading

- Use `WeatherLayers.loadTextureData(url, options?)` for PNG, WebP, or GeoTIFF.
- Use a `{ data, width, height }` `TextureData` object for custom decoded data.
- Use `imageType: WeatherLayers.ImageType.SCALAR` for one variable.
- Use `imageType: WeatherLayers.ImageType.VECTOR` for U/V vector components.
- For byte data, keep `imageUnscale`, `interval`, and displayed units in the same data scale.

## MapLibre Test Page

The local test page for this fork is:

```text
docs/test/my-contour-maplibre.html
```

It loads `dist/weatherlayers-deck.umd.min.js` and the local `docs/test/data.byte.webp`.
After TypeScript changes, run Rollup before expecting the browser page to change.

## Common Pitfalls

- Ensure only one deck.gl bundle/version is used; duplicate bundles can break shader hooks and make layers disappear.
- If labels do not change in the browser, rebuild `dist/weatherlayers-deck.umd.min.js` and hard refresh the test page.
- Do not use `labelInterval` for `LabelContourLayer`; labels are generated for all contour intervals.
- Use `CUBIC` interpolation for smooth visuals and for contour rendering with byte data.
