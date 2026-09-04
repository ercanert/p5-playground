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
drawn as transparent, animated dark-ink marks ready for compositing over a
separate paper, wall, or projection texture.

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
- `C` holds the near-black carbon and brown iron-gall-inspired ink palette.
- `INK` controls the paper-wick, grains, pooled pigment, blobs and specks.
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
