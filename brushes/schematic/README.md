# Cezeri Mechanisms

An interactive, generative drawing brush inspired by the water machines,
clocks and automata described by al-Jazari at the Artuqid court. It is a new
visual interpretation, not a reproduction of a historical manuscript.

Each stroke places a chain of mechanisms on an invisible grid: waterwheels,
vessels, pumps, gears, pulleys, clock faces and occasional small automata.
The mechanisms are joined by water channels, ropes and drive shafts, then
drawn into an aged parchment field like an animated ink-and-pigment folio.

## Run

Open `index.html?brush=schematic`, or use these presets:

- `?brush=schematic&auto&style=water` for water devices and channels.
- `?brush=schematic&auto&style=clock` for gears, pulleys and clock faces.
- `?brush=schematic&auto&style=mixed&mirror` for a symmetrical projection-ready composition.

## Controls

| Key / action | Effect |
| --- | --- |
| drag | draw a linked chain of mechanisms |
| click | add a single mechanism |
| `1` `2` `3` | water / clock / mixed visual language |
| `0` | choose water or clock vocabulary per stroke |
| `[` `]` | brush size down / up |
| `-` `=` | mechanism density down / up |
| `m` | mirror every stamp across the page centre |
| `space` | animate an auto-filled composition |
| `e` | toggle eraser |
| `c` | clear everything |
| `r` | clear and choose a new base scale |
| `s` | save PNG |

## Art direction

The primary controls are near the top of `sketch.js`:

- `WATER_NODES` and `CLOCK_NODES` change which mechanical motifs appear.
- `C` holds the ink, water, copper, gold and red pigment palette.
- `INK` controls the paper-wick, grains, pooled pigment, blobs and specks.
- `nodeWaterwheel`, `nodePump`, `nodeVessel`, `nodeGear`, `nodeClock` and
  `nodePulley` define the individual motifs.
- `connect`, `waterChannel`, `rope` and `driveShaft` define the relationships
  between mechanisms.

The brush intentionally uses non-linguistic rosettes rather than invented
Arabic writing. Add real, sourced manuscript labels only when their wording,
language and calligraphic treatment have been researched.
