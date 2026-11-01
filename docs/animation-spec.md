# Landing intro: animation spec

Read from Figma file `fH4Sdb4hOCkilgEZM48x55` through the REST API, because the MCP tools
were rate limited. All nine variants of frame 49 (`337:332`) were read. Nothing below is
interpolated or estimated.

## Stage

- Fixed-aspect stage: 1235 × 666, the variant component's size. Percentages are of this box.
- On the 1440 homepage (`331:155`) the stage sits at x 151, y 110.
- The grid is 1140 × 665 on a 95px module (12 × 7 cells), so it stops 95px short of the
  stage's right edge. The Port House overhangs the grid there.
- The stage does not clip. In states 1 and 2 the Port House insert and box reach x 1330,
  which is 1481 on the 1440 page, and the homepage frame clips them.

## Steps

Every step in the file is On Hover, Smart Animate, Ease In, 250ms, except state 9.

| Step | Time | What moves | What swaps |
|---|---|---|---|
| 1→2 | 0–250 | All four inserts translate | |
| 2→3 | 250–500 | All translate, Elbphilharmonie turns to 90° | |
| 3→4 | 500–750 | Reichstag and Elbphilharmonie translate, Elbphilharmonie to 0°, Coal Drops to -90° in place, Port House still | |
| 4→5 | 750–1000 | Reichstag, Elbphilharmonie and Port House translate, Coal Drops to 0° in place. Reichstag and Elbphilharmonie arrive | |
| 5→6 | 1000–1250 | Coal Drops and Port House translate | Reichstag and Elbphilharmonie: host + insert out, combined in |
| 6→7 | 1250–1500 | Coal Drops and Port House translate. Port House arrives | |
| 7→8 | 1500–1750 | Coal Drops translates and arrives | Port House: host + insert out, combined in |
| 8→9 | 1750–2000 | Nothing | Coal Drops: host + insert out, combined in |
| 9→1 | | Your measured values: hold ~2500ms, ~400ms crossfade | See "Differences" |

## Easing

Stepped, as in the prototype: GSAP `power2.in` on each 250ms step, so every insert stops on
each grid line. A continuous `power2.inOut` version was built, compared and not chosen.

## Attached boxes

Black outline cells, 2px stroke centred, no fill, 95px each, drawn above the insert image in
the same group. They move and rotate with the group and vanish with it. Positions are within
the group, at rotation 0:

| Insert | Group size | Cells (x, y) | Image inside group |
|---|---|---|---|
| Reichstag | 95×95 | 0,0 | 8, 30, 80×38 |
| Coal Drops | 285×95 | 0,0  95,0  190,0 | 8, 16, 270×60 |
| Elbphilharmonie | 285×190 | 0,0  95,0  0,95  95,95  190,95 | 6, 14, 229×166 |
| Port House | 285×285 | 95,0  190,0  0,95  95,95  190,95  0,190  95,190 | 0, 33.97, 285×234.03 |

## Grid

Black 1px lines at 40% opacity in every state: 8 horizontal lines, 13 vertical lines, in two
frames offset by 2px vertically in Figma.

## Stacking, bottom to top

Grid, hosts (Reichstag, Coal Drops, Port House, Elbphilharmonie), inserts (Reichstag, Coal
Drops, Elbphilharmonie, Port House), combined (Elbphilharmonie, Port House, Coal Drops,
Reichstag). On the homepage the whole stage sits above the headline.

## Differences between the file and the brief

- **Rotation:** only Coal Drops and Elbphilharmonie rotate. Reichstag and Port House are 0° in
  all nine states.
- **Return step:** state 9 → 1 is On Click with no transition in the file, not hover and not
  animated. The hold and crossfade come from your recording.
- **Swap times:** Reichstag 1250, Port House 1750, Coal Drops 2000, against your recording's
  ~1.6s and ~2.2s. The variants are used.
- **Insert orientation:** `insert-coaldrop.png` and `insert-elbphilharmonie.png` are stored
  rotated 180° from the Figma image, checked by pixel comparison with the renders. The rotation
  column assumes the build rotates those two files upright.
- **Rotation direction:** Figma reports the half turn as -180° either way. The tween column
  takes the shortest arc, so Coal Drops turns clockwise and Elbphilharmonie anticlockwise.
- **Path:** the file gives end states only. The tween runs the group's centre in a straight
  line while rotating, which may differ slightly from Smart Animate's arc.
- **Scale:** nothing changes size. Every scale is 1. Port House combined reads 332×234 in
  state 7 and 332.34×234 elsewhere, while hidden, so it has no visible effect.

## Every element, every state

Opacity 0 means the layer is hidden in that variant. Smart Animate fades those changes, which
gives the crossfades above.

| State | Element | Centre px (x, y) | Centre % of stage (x, y) | Size px | Rotation, Figma | Rotation, tween | Scale | Opacity |
|---|---|---|---|---|---|---|---|---|
| 1 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 2 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 3 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 4 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 5 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 6 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 7 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 8 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 9 | grid-horizontal | 570, 331.5 | 46.15, 49.77 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 1 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 2 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 3 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 4 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 5 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 6 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 7 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 8 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 9 | grid-vertical | 570, 333.5 | 46.15, 50.08 | 1140×663 | 0° | 0° | 1 | 0.4 |
| 1 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 1 |
| 2 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 1 |
| 3 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 1 |
| 4 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 1 |
| 5 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 1 |
| 6 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 0 |
| 7 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 0 |
| 8 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 0 |
| 9 | host-reichstag | 254, 609 | 20.57, 91.44 | 420×112 | 0° | 0° | 1 | 0 |
| 1 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 1 |
| 2 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 1 |
| 3 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 1 |
| 4 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 1 |
| 5 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 1 |
| 6 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 1 |
| 7 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 1 |
| 8 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 1 |
| 9 | host-coaldrop | 532.29, 585.5 | 43.10, 87.91 | 248.57×145 | 0° | 0° | 1 | 0 |
| 1 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 1 |
| 2 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 1 |
| 3 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 1 |
| 4 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 1 |
| 5 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 1 |
| 6 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 1 |
| 7 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 1 |
| 8 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 0 |
| 9 | host-porthouse | 1015.5, 589 | 82.23, 88.44 | 245×110 | 0° | 0° | 1 | 0 |
| 1 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 1 |
| 2 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 1 |
| 3 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 1 |
| 4 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 1 |
| 5 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 1 |
| 6 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 0 |
| 7 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 0 |
| 8 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 0 |
| 9 | host-elbphilharmonie | 796, 619.5 | 64.45, 93.02 | 246×91 | 0° | 0° | 1 | 0 |
| 1 | insert-reichstag + box | 142.5, 237.5 | 11.54, 35.66 | 95×95 | 0° | 0° | 1 | 1 |
| 2 | insert-reichstag + box | 237.5, 238.5 | 19.23, 35.81 | 95×95 | 0° | 0° | 1 | 1 |
| 3 | insert-reichstag + box | 237.5, 333.5 | 19.23, 50.08 | 95×95 | 0° | 0° | 1 | 1 |
| 4 | insert-reichstag + box | 237.5, 428.5 | 19.23, 64.34 | 95×95 | 0° | 0° | 1 | 1 |
| 5 | insert-reichstag + box | 237.5, 522.5 | 19.23, 78.45 | 95×95 | 0° | 0° | 1 | 1 |
| 6 | insert-reichstag + box | 237.5, 522.5 | 19.23, 78.45 | 95×95 | 0° | 0° | 1 | 0 |
| 7 | insert-reichstag + box | 237.5, 522.5 | 19.23, 78.45 | 95×95 | 0° | 0° | 1 | 0 |
| 8 | insert-reichstag + box | 237.5, 522.5 | 19.23, 78.45 | 95×95 | 0° | 0° | 1 | 0 |
| 9 | insert-reichstag + box | 237.5, 522.5 | 19.23, 78.45 | 95×95 | 0° | 0° | 1 | 0 |
| 1 | insert-coaldrop + box | 427.5, 143.5 | 34.62, 21.55 | 285×95 | -180° | -180° | 1 | 1 |
| 2 | insert-coaldrop + box | 522.5, 143.5 | 42.31, 21.55 | 285×95 | -180° | -180° | 1 | 1 |
| 3 | insert-coaldrop + box | 522.5, 238.5 | 42.31, 35.81 | 285×95 | -180° | -180° | 1 | 1 |
| 4 | insert-coaldrop + box | 522.5, 237.5 | 42.31, 35.66 | 285×95 | -90° | -90° | 1 | 1 |
| 5 | insert-coaldrop + box | 522.5, 237.5 | 42.31, 35.66 | 285×95 | 0° | 0° | 1 | 1 |
| 6 | insert-coaldrop + box | 522.5, 332.5 | 42.31, 49.92 | 285×95 | 0° | 0° | 1 | 1 |
| 7 | insert-coaldrop + box | 522.5, 427.5 | 42.31, 64.19 | 285×95 | 0° | 0° | 1 | 1 |
| 8 | insert-coaldrop + box | 522.5, 522.5 | 42.31, 78.45 | 285×95 | 0° | 0° | 1 | 1 |
| 9 | insert-coaldrop + box | 522.5, 522.5 | 42.31, 78.45 | 285×95 | 0° | 0° | 1 | 0 |
| 1 | insert-elbphilharmonie + box | 807.5, 95 | 65.38, 14.26 | 285×190 | -180° | 180° | 1 | 1 |
| 2 | insert-elbphilharmonie + box | 807.5, 191 | 65.38, 28.68 | 285×190 | -180° | 180° | 1 | 1 |
| 3 | insert-elbphilharmonie + box | 760, 333.5 | 61.54, 50.08 | 285×190 | 90° | 90° | 1 | 1 |
| 4 | insert-elbphilharmonie + box | 807.5, 381 | 65.38, 57.21 | 285×190 | 0° | 0° | 1 | 1 |
| 5 | insert-elbphilharmonie + box | 807.5, 476 | 65.38, 71.47 | 285×190 | 0° | 0° | 1 | 1 |
| 6 | insert-elbphilharmonie + box | 807.5, 476 | 65.38, 71.47 | 285×190 | 0° | 0° | 1 | 0 |
| 7 | insert-elbphilharmonie + box | 807.5, 476 | 65.38, 71.47 | 285×190 | 0° | 0° | 1 | 0 |
| 8 | insert-elbphilharmonie + box | 807.5, 476 | 65.38, 71.47 | 285×190 | 0° | 0° | 1 | 0 |
| 9 | insert-elbphilharmonie + box | 807.5, 476 | 65.38, 71.47 | 285×190 | 0° | 0° | 1 | 0 |
| 1 | insert-porthouse + box | 1187.5, 142.5 | 96.15, 21.40 | 285×285 | 0° | 0° | 1 | 1 |
| 2 | insert-porthouse + box | 1187.5, 238.5 | 96.15, 35.81 | 285×285 | 0° | 0° | 1 | 1 |
| 3 | insert-porthouse + box | 1092.5, 238.5 | 88.46, 35.81 | 285×285 | 0° | 0° | 1 | 1 |
| 4 | insert-porthouse + box | 1092.5, 238.5 | 88.46, 35.81 | 285×285 | 0° | 0° | 1 | 1 |
| 5 | insert-porthouse + box | 1092.5, 332.5 | 88.46, 49.92 | 285×285 | 0° | 0° | 1 | 1 |
| 6 | insert-porthouse + box | 1092.5, 427.5 | 88.46, 64.19 | 285×285 | 0° | 0° | 1 | 1 |
| 7 | insert-porthouse + box | 1092.5, 522.5 | 88.46, 78.45 | 285×285 | 0° | 0° | 1 | 1 |
| 8 | insert-porthouse + box | 1092.5, 522.5 | 88.46, 78.45 | 285×285 | 0° | 0° | 1 | 0 |
| 9 | insert-porthouse + box | 1092.5, 522.5 | 88.46, 78.45 | 285×285 | 0° | 0° | 1 | 0 |
| 1 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 0 |
| 2 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 0 |
| 3 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 0 |
| 4 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 0 |
| 5 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 0 |
| 6 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 1 |
| 7 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 1 |
| 8 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 1 |
| 9 | combined-elbphilharmonie | 785.5, 554.5 | 63.60, 83.26 | 229×217 | 0° | 0° | 1 | 1 |
| 1 | combined-porthouse | 1069.17, 532 | 86.57, 79.88 | 332.34×234 | 0° | 0° | 1 | 0 |
| 2 | combined-porthouse | 1069.17, 532 | 86.57, 79.88 | 332.34×234 | 0° | 0° | 1 | 0 |
| 3 | combined-porthouse | 1069.17, 532 | 86.57, 79.88 | 332.34×234 | 0° | 0° | 1 | 0 |
| 4 | combined-porthouse | 1069.17, 532 | 86.57, 79.88 | 332.34×234 | 0° | 0° | 1 | 0 |
| 5 | combined-porthouse | 1069.17, 532 | 86.57, 79.88 | 332.34×234 | 0° | 0° | 1 | 0 |
| 6 | combined-porthouse | 1069.17, 532 | 86.57, 79.88 | 332.34×234 | 0° | 0° | 1 | 0 |
| 7 | combined-porthouse | 1069, 532 | 86.56, 79.88 | 332×234 | 0° | 0° | 1 | 0 |
| 8 | combined-porthouse | 1069.17, 532 | 86.57, 79.88 | 332.34×234 | 0° | 0° | 1 | 1 |
| 9 | combined-porthouse | 1069.17, 532 | 86.57, 79.88 | 332.34×234 | 0° | 0° | 1 | 1 |
| 1 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 0 |
| 2 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 0 |
| 3 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 0 |
| 4 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 0 |
| 5 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 0 |
| 6 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 0 |
| 7 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 0 |
| 8 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 0 |
| 9 | combined-coaldrop | 523, 595 | 42.35, 89.34 | 270×120 | 0° | 0° | 1 | 1 |
| 1 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 0 |
| 2 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 0 |
| 3 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 0 |
| 4 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 0 |
| 5 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 0 |
| 6 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 1 |
| 7 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 1 |
| 8 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 1 |
| 9 | combined-reichstag | 231.5, 597.5 | 18.74, 89.71 | 373×135 | 0° | 0° | 1 | 1 |
