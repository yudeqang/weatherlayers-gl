# WeatherLayers GL

Weather Visualization Layers and Controls for deck.gl

Package and source code is dual-licensed, the choice of license is MPL-2.0 or our [License Terms of Use](https://weatherlayers.com/license-terms-of-use.html). Contact [support@weatherlayers.com](mailto:support@weatherlayers.com) for details.

* [Homepage](https://weatherlayers.com/)
* [Demo](https://demo.weatherlayers.com/)
* [Docs](https://docs.weatherlayers.com/)

## Install This Fork

Install this fork directly from GitHub:

```sh
npm install github:yudeqang/weatherlayers-gl
```

To pin an exact build, install a commit:

```sh
npm install github:yudeqang/weatherlayers-gl#<commit-sha>
```

The package name is still `weatherlayers-gl`, so imports stay the same:

```js
import * as WeatherLayers from "weatherlayers-gl";
```

If you want to use the dependency name `me-layers` in your own app, add an npm
alias in your app's `package.json`:

```json
{
  "dependencies": {
    "me-layers": "github:yudeqang/weatherlayers-gl#main"
  }
}
```

Then run `npm install` and import from the alias:

```js
import * as WeatherLayers from "me-layers";
```

This repository includes built `dist` files, so GitHub installation works without
running Rollup in the consuming project.

For local development from a sibling checkout:

```sh
npm install ../weatherlayers-gl
```

or with an absolute Windows path:

```sh
npm install C:\Users\10171\Documents\Codex\2026-06-10\who-are-you-3\weatherlayers-gl
```

## Install The Codex Skill

This repo includes a Codex skill at:

```text
skills/weatherlayers-gl
```

Install or update it on Windows PowerShell:

```powershell
$src = "C:\Users\10171\Documents\Codex\2026-06-10\who-are-you-3\weatherlayers-gl\skills\weatherlayers-gl"
$dst = "$env:USERPROFILE\.codex\skills\weatherlayers-gl"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -Recurse -Force $src $dst
```

Start a new Codex thread/session after copying so the skill metadata is reloaded.
The skill includes `references/weatherlayers-gl-reference.md` for the fuller
layer and control reference.

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
