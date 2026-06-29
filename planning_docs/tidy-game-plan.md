# Tidy Time Mini-Game — Plan

A new mini-game for "Take Care of Me". The child puts all the toys away in the toy box. Triggered from the mini-game select screen (second tile, after catch).

## Goals

- Add a second mini-game tile ("toy box") to MiniGameSelectScene.
- Drag every toy into the toy box. No fail state — toys dropped on the floor float back.
- Teach toy names (each toy is named as it goes in), the preposition "in", and tidying-up language.
- Calm, satisfying, repetitive — the loop is the reward.
- Automatic exit after all toys are tidied, back to the main game.

## Architecture changes

### New files

```
/scenes
  TidyScene.js             ← the tidy mini-game
```

### Modified files

- `index.html` — add `<script>` tag for `TidyScene.js`.
- `main.js` — register `TidyScene` in the scene list.
- `scenes/BootScene.js` — load new audio (see asset doc) and the `mini_toybox` image.
- `scenes/MiniGameSelectScene.js` — add a second tile for tidy. The 2-tile layout should sit side by side, centred horizontally.
- `data/minigames.js` — add the tidy entry.
- `data/phrases.js` — add new phrase arrays (see Audio section).
- `sw.js` — bump `CACHE_NAME`.

### Scene flow

```
PlayScene → (after 3 trays) → MiniGameSelectScene → TidyScene → PlayScene
```

Same return path as CatchScene: PlayScene receives `{ fromMinigame: true }` and resumes the request flow without re-playing chosen audio.

## MiniGameSelectScene — add the second tile

Update the grid layout to support 2 tiles side by side, centred horizontally with a sensible gap. The existing single-tile centred layout becomes the special case for 1 tile.

Two tiles for now:
- Catch (uses `item_ball`).
- Tidy (uses `mini_toybox`).

When the child taps the tidy tile, play one of the `tidyChosen` phrases, then transition to `TidyScene` with `{ characterId }`.

## TidyScene

### Layout

- Same bedroom background.
- Chosen character positioned upper-centre (around y = 30% of screen height), facing forward. Stays in `neutral` or `happy`, idle bounce continues gently.
- Toy box positioned bottom-centre, slightly raised from the very bottom (around y = 85% of screen height). Generously sized so it's an easy drag target (suggest ~280×280px at reference resolution).
- The 5 toys scatter across the "floor" area (middle band of the screen, roughly y = 45% to y = 75%).

### Toy spawning

All 5 play-category items every time:
- `item_book`
- `item_ball`
- `item_blocks`
- `item_car`
- `item_teddy`

For each toy:

1. **Random position** within the floor band. Enforce minimum spacing (~150px between toy centres) so they don't overlap — pick a random position, check distance from already-placed toys, retry up to 20 times if too close.
2. **Random rotation** in the range ±20°.
3. **Perspective scale** based on y position. Toys higher up (further away) are smaller, toys lower down (closer to the player) are larger:
   ```js
   const yFraction = (toy.y - floorTop) / (floorBottom - floorTop);
   const scale = Phaser.Math.Linear(0.75, 1.10, yFraction);
   ```
   This scale persists through dragging — toys keep their perspective size.
4. **Tumble-in animation:** each toy starts at y = -100 (above the screen), tweens to its final position with a small bounce-ease. Stagger the entry by ~80ms per toy so they don't all land at once. Slight rotation tween during the fall.

### Toy box

- `mini_toybox` image, positioned bottom-centre.
- Slides in from below (off-screen) at scene start, finishing before the first toy tumbles in.
- Has a "hit zone" — when a toy is released within `BOX_RADIUS` (suggest 160px) of the box centre, it counts as a successful drop.

### Drag mechanics

- Each toy is draggable, identical to the main game's drag setup.
- On drop:
  - **Within hit zone** → success (see below).
  - **Outside hit zone** → toy tweens back to its spawn position (same as wrong-answer behaviour in the main game). Plays one of the `tidyOops` phrases — but only sometimes (~40% chance) so the child isn't told off for every miss.
- All toys remain interactable throughout — no input lock while audio plays in this scene (see Audio Rhythm below).

### Successful drop sequence

When a toy is dropped on the box:

1. **Immediately** play the `plop` sound effect (interrupt nothing, just play it).
2. The toy animates into the box: tween scale to 0, y +30, rotation by ±90°, duration 300ms. Destroy when the tween completes.
3. **Sometimes** (~50% chance) queue an `inItGoes` phrase ("In it goes!", "And that one!", "Get the other one too!").
4. **Always** show the toy's name big in the centre of the screen — large white text with black outline, same style as request text in the main game. Scale-in tween from 0 to 1 (200ms), hold 800ms, scale out (200ms). Queue the matching `tidyName` audio (`tidy_name_ball`, `tidy_name_book`, etc.) so the character speaks the name as it appears.
5. **Sometimes** (~30% chance) queue a `nextOne` phrase ("Next one!", "Keep going!").

Use the existing `queueAudio` and `queueThen` helpers — voice lines fall in line, drop sounds play instantly.

### Audio rhythm — important

Unlike the main game, **do NOT lock drag input while audio plays in TidyScene.** A toddler tidying briskly shouldn't have to wait between drops. Approach:

- Drop sound effects play immediately on drop, can overlap with anything.
- Voice lines go through the audio queue and play in order.
- If the child drops toys faster than the voice can keep up, voice queues up and the child carries on. Voice catches up naturally.
- The audio queue should not set `_inputLocked` in this scene (or override by ignoring `_inputLocked` for the drag handlers here).

### Ending

When the last toy goes in:

1. Drop sound + the usual name display for the final toy.
2. After the name finishes, queue an `allTidy` phrase ("All nice and clean!", "All tidy! Well done!").
3. Character switches to `jumping` emotion and does a celebration bounce.
4. Optional: small sparkle/star tween over the toy box.
5. After the audio finishes, transition back to PlayScene with `{ characterId, fromMinigame: true }`.

### Visual polish

- When a toy is picked up (drag start), scale up slightly (e.g. ×1.1 of its current scale) to signal "I've got it".
- Toy box has a very subtle idle pulse (scale 1.0 → 1.02 → 1.0, 2s cycle) so it's clearly the target.
- When a toy enters the hit zone during a drag, the toy box gives a small "ready to receive" cue — e.g. a soft glow or a tiny scale up. Released → success.

## Modifications to MiniGameSelectScene layout

Compute tile positions from the tile count:

```js
// Pseudo-layout
const tileWidth = 280;
const gap = 60;
const totalWidth = tiles.length * tileWidth + (tiles.length - 1) * gap;
const startX = (this.scale.width - totalWidth) / 2 + tileWidth / 2;
tiles.forEach((tile, i) => {
  tile.x = startX + i * (tileWidth + gap);
  tile.y = this.scale.height * 0.5;
});
```

This naturally supports 1, 2, 3, or 4 tiles in a row. (For 4+ tiles in future, switch to a 2×2 grid — but not needed yet.)

## Modifications to phrases.js

Add to `PHRASES`:

```js
tidyChosen:    ['tidy_chosen_1', 'tidy_chosen_2'],
tidyOpening:   ['tidy_opening_1', 'tidy_opening_2'],
tidyName:      {
  ball:    'tidy_name_ball',
  book:    'tidy_name_book',
  blocks:  'tidy_name_blocks',
  car:     'tidy_name_car',
  teddy:   'tidy_name_teddy',
},
inItGoes:      ['in_it_goes_1', 'in_it_goes_2', 'in_it_goes_3'],
nextOne:       ['next_one_1', 'next_one_2'],
tidyOops:      ['tidy_oops_1', 'tidy_oops_2'],
allTidy:       ['all_tidy_1', 'all_tidy_2'],
```

The `tidyName` map is keyed by item id rather than being a flat array, so the right audio plays for the right toy.

## Data: minigames.js

```js
const MINIGAMES = [
  {
    id: 'catch',
    name: 'Catch',
    image: 'item_ball',
    inviteAudioKey: 'playCatch',
    scene: 'CatchScene',
  },
  {
    id: 'tidy',
    name: 'Tidy',
    image: 'mini_toybox',
    inviteAudioKey: 'tidyChosen',
    scene: 'TidyScene',
  },
];
```

(Updating the catch entry's audio key to the same pattern so MiniGameSelectScene can pick the right phrase array generically.)

## Suggested build order

1. Add the toy box image to `assets/images/` and update BootScene to load it.
2. Add all new audio files and register them in `phrases.js`.
3. Update MiniGameSelectScene to a 2-tile layout and wire the second tile.
4. Build TidyScene skeleton — character, toy box, 5 toys scattered with perspective scaling and random rotation. No audio yet.
5. Add drag + hit detection + success animation + return-to-spawn for missed drops.
6. Add the audio sequence (drop sound, name display, optional phrases).
7. Add the ending celebration + return to PlayScene.
8. Polish: tumble-in entrance, pick-up scale, toy box pulse and hit-zone glow.

## Testing notes

- The hit zone needs to be very generous — a 3-year-old's drag won't land precisely on the box centre. 160px radius is a starting point; tune by watching a real child.
- Watch for toys that overlap when scattered. The minimum-spacing retry helps, but with 5 toys in a constrained band there may still be edge cases. If two toys end up too close, just accept it — they're still draggable.
- The "sometimes" probabilities (50% for "in it goes", 30% for "next one", 40% for "oops") may need tuning. The principle is: not every drop has a voice line, so the character feels present but not chatty.
- Drop sounds should be satisfying. Test on a phone speaker — small phone speakers eat low frequencies, so a deep "thunk" might disappear; a mid-range "plop" tends to carry better.

## Out of scope (for later)

- "Again?" prompt at the end — the child can return to the mini-game select via the existing trigger.
- Toy box opening/closing animation with a lid.
- Sparkle effects on success (optional bonus, easy to add).
- Categorisation versions (kitchen things to the kitchen, etc.) — separate mini-game later.
- A "tidied today" tally for parents.
