# WeatherLayers GL

Weather Visualization Layers and Controls for deck.gl

Package and source code is dual-licensed, the choice of license is MPL-2.0 or our [License Terms of Use](https://weatherlayers.com/license-terms-of-use.html). Contact [support@weatherlayers.com](mailto:support@weatherlayers.com) for details.

* [Homepage](https://weatherlayers.com/)
* [Demo](https://demo.weatherlayers.com/)
* [Docs](https://docs.weatherlayers.com/)

## labelContour

This fork adds `LabelContourLayer` for Windy-style contour lines with value labels.
The layer keeps the legacy `MyContourLayer` export as an alias, but new code should use
`WeatherLayers.LabelContourLayer`.

```js
new WeatherLayers.LabelContourLayer({
  id: 'labelContour',
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

`labelZoomThresholds` is an ordered list of `[maxPathLength, minZoom]` rules.
Labels whose contour path length is below `maxPathLength` appear at `minZoom`;
longer labels fall through to zoom `0`. The default is `[[2, 9], [5, 7], [10, 5]]`,
so zoom `9` shows all generated labels.

The MapLibre test page is available at:

```text
docs/test/my-contour-maplibre.html
```

By installing, you agree to our [Privacy Policy](https://weatherlayers.com/privacy-policy.html).
