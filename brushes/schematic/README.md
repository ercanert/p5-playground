# Cezeri Mechanisms

An interactive, generative drawing brush inspired by the water machines,
clocks and automata described by al-Jazari at the Artuqid court. It is a new
visual interpretation, not a reproduction of a historical manuscript.

Each stroke places a chain of mechanisms on an invisible grid: waterwheels,
vessels, pumps, gears, pulleys, siphons, fountains, valves, astrolabes,
beam balances, ewers, basins, bucketed water wheels, peacock and elephant
clocks, palace gates, castle and candle clocks, musical boats, locks,
chain-of-pots pumps, flute fountains, scribe clocks and occasional small
automata.
The mechanisms are joined by water channels, ropes and drive shafts, then
drawn as animated candle-fire marks over a pure-black background. Completed
lines retain a softly moving gold gradient and a bounded set of drifting
sparks suitable for projection.

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
| `v` | render the deterministic 720p/24 fps rectangle test to `renders/` |
| `Shift+v` | render the same composition natively at 1080p/24 fps |

## Deterministic video export

Run the project with `npm run dev`, then press `v` in the Cezeri brush to
render and automatically save `renders/cezeri-rectangle-720p-24fps.webm`.
The test contains 240 explicitly timestamped drawing frames over 10 seconds,
followed by a 24-frame safe hold. It uses WebCodecs rather than recording the
live screen, so a slow render cannot alter the video's 24 fps timing.

For a completely automatic headless run, use `npm run render:test`. The test
draws a centred horizontal rectangle that is 60% of the 1280x720 frame width.
Use `npm run render:1080` for the matching 1920x1080 version.
The current 1080p preset keeps rising sparks active from each mechanism's
first drawing frame through the completed one-second hold.

## Art direction

The primary controls are near the top of `sketch.js`:

- `WATER_NODES` and `CLOCK_NODES` change which mechanical motifs appear.
- `C` and `FLAME` hold the ivory, wax-yellow and muted-gold fire palette.
- `INK` controls the line texture, pooled light, blobs and initial sparks.
- `glowMask` and `MAX_IDLE_SPARKS` bound the idle animation cost regardless
  of how many source line segments have accumulated.
- `nodeWaterwheel`, `nodePump`, `nodeVessel`, `nodeGear`, `nodeClock`,
  `nodeSiphon`, `nodeFountain`, `nodeValve`, `nodeAstrolabe` and
  `nodeBalance` define the individual motifs; `nodeCrownGear` and
  `nodeGearTrain` add two more distinct transmission forms; `nodeEwer`, `nodeBasin`,
  `nodeNoria`, `nodePeacock`, `nodeElephant` and `nodeGate` add device
  families drawn from al-Jazari's clocks and water automata. `nodeCastle`,
  `nodeCandle`, `nodeMusicBoat`, `nodeLock`, `nodeChainPump`,
  `nodeFluteFountain` and `nodeScribe` broaden the silhouettes further.
- `EASTERN_DIGITS` and `measurementNotation` add genuine Eastern Arabic
  numerals to dial faces, vessels and small ticked measurement rules.
- `CEZERI_LABELS` and `technicalLabel` occasionally add real Arabic technical
  nouns—water, clock/hour, vessel, basin, wheel, chain, lock, door, balance
  and machine—rather than decorative pseudo-script.
- `connect`, `waterChannel`, `rope` and `driveShaft` define the relationships
  between mechanisms.

The brush intentionally uses Eastern Arabic numerals and a small set of real
technical nouns rather than invented Arabic writing. The labels are contextual
vocabulary, not a claimed transcription or word-frequency analysis of any
specific manuscript page.
