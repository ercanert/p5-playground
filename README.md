# p5 brushes

A small collection of p5.js drawing brushes sharing one page. Open
`index.html` in a browser (p5.js loads from a CDN) and pick a brush from the
menu in the top-left corner, or open `index.html?brush=<name>` directly.

For deterministic Cezeri WebM rendering, install dependencies with `npm
install`, then run `npm run dev` and press `v`. The resulting 1280x720, 24 fps
test video is saved automatically under `renders/`. `npm run render:test`
runs the same export headlessly; `npm run render:1080` renders the matching
1920x1080 version.

| Brush | Folder | What it draws |
| --- | --- | --- |
| Score Brush | [`brushes/score/`](brushes/score/README.md) | ribbons of staff lines with animated graphic-score snippets in five colours |
| Cezeri Mechanisms | [`brushes/schematic/`](brushes/schematic/README.md) | candle-lit water machines, clocks, gears and vessels on pure black, inspired by al-Jazari |
| Balloon Brush | [`brushes/balloon/`](brushes/balloon/README.md) | a hidden poster of perfectly fitting airbrushed blobs in five spot colours, revealed blob by blob along each line you draw |

Each brush's own README lists its keys. `?auto` on any brush starts with a
page that paints itself, and `h` hides the help panel.

## Layout

```
index.html              page chrome: brush picker + help panel
shared/loader.js        reads ?brush=, fills the picker, loads the sketch
shared/hud.js           buildHUD / setStatus / toggleHUD / onCanvas /
                        drawBrushCursor helpers
brushes/<name>/sketch.js   one p5 global-mode sketch per brush
```

## Adding a brush

1. Create `brushes/<name>/sketch.js` with the usual p5 `setup` / `draw`.
2. Declare `const BRUSH = { name, swatch, help }` (help is a list of
   `[keys, effect]` pairs) and call `buildHUD(BRUSH)` from `setup`.
3. Report live state with `setStatus(text)`; guard `mousePressed(e)` with
   `onCanvas(e)` so clicks on the picker do not start strokes.
4. Call `drawBrushCursor()` at the end of `draw`. Every brush shares one
   cursor — a single black dot, whatever the brush or its mode — so do not
   draw a cursor of your own.
5. Add `['<name>', 'Display Name']` to `BRUSHES` in `shared/loader.js`.
