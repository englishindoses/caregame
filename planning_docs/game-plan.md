# Take Care of Me — Game Plan

A touch-based vocabulary game for 3-year-olds. The child chooses a character (Dolly, Giraffe, or Bunny) and takes care of them by giving them what they ask for. **The game is complete.**

## Tech stack

- **Phaser 3.60** (loaded via CDN — no build step needed).
- **Vanilla JavaScript** — plain script tags loaded in order, no ES modules, no bundler.
- **Audio**: MP3 files (AI-generated).
- **Images**: PNG files (generated with ChatGPT).
- **Local development**: serve the repo root with `python -m http.server` or `npx serve .`.
- **Target**: portrait mobile browsers, `Scale.FIT` mode for responsive scaling.

## File structure

```
/                           ← repo root (game folder is the git root)
  index.html                ← loads Phaser + all scripts in order
  main.js                   ← Phaser config, scale settings, scene list
  CLAUDE.md
  /scenes
    BootScene.js            ← loads all images and audio, shows loading screen
    SelectScene.js          ← character picker
    PlayScene.js            ← main game loop
  /data
    items.js                ← all items (id, name, request, image key, audio key, category)
    characters.js           ← all characters (id, name, color, image keys)
    phrases.js              ← shared phrases (thank you variants, all done, chosen)
  /assets
    /images                 ← 25 PNGs (character emotions, items, background)
    /audio                  ← 23 MP3s (requests, thank-yous, all-done, chosen)
  /planning_docs            ← planning docs, not part of the game
```

All scripts loaded via `<script>` tags in `index.html`. Each file defines classes or constants on the global scope. No `import`/`export`.

## Scene 1 — Boot ✓

Loads all assets with a simple progress bar. If a character is saved in `localStorage`, skips SelectScene and goes straight to PlayScene. Otherwise transitions to SelectScene.

## Scene 2 — Select ✓

- Title: "Who would you like to look after?"
- 3 characters in a triangle layout (2 top row, 1 centred below), each gently bouncing.
- Tap a character → it does a scale pulse, transitions to PlayScene with `{ characterId, fromSelect: true }`.
- On arriving in PlayScene, the "chosen" audio plays (cycles through 3 variants in order).
- Character choice is saved to `localStorage` — returning players skip this scene.

## Scene 3 — Play ✓

**Layout:**
- Cozy bedroom background.
- Chosen character centred in the upper portion of the screen.
- Tray of 3 items along the bottom, evenly spaced.
- Request text above the character: "Can I have [request], please?"
- Hidden long-press zone in top-right corner (100×100px) for parent menu.

**Game loop:**
1. Tray populated with 3 items from the deck.
2. A random tray item is chosen as the request. Request audio plays. Character switches to neutral or needy (40% chance of needy).
3. Child drags an item from the tray onto the character.
4. **Correct**:
   - Character switches to `happy` face.
   - Plays a random thank-you audio (4 variants).
   - Celebration bounce animation.
   - Item disappears from tray.
   - After 700ms, next request picked from remaining tray items.
5. **Wrong**:
   - Item tweens back to its tray position.
   - Wrong-counter increments.
   - Character switches to needy.
   - Request audio repeats.
6. **After 3 wrong tries on the same request**:
   - Yellow glow pulses behind the correct item.
   - Correct item wiggles continuously.
   - Next tap or drag on that item counts as correct and triggers full celebration.
7. Tray empty → "All done! Well done!" text, all-done audio plays, new tray dealt after 1400ms. Loop continues.

**Parent menu (long-press, 2s hold):**
- Subtle arc draws in the top-right corner during the hold.
- Opens a panel with: Mute/Unmute, Change character, Exit.
- Mute state persisted in `localStorage`.
- Tapping the dim overlay dismisses the menu.

## Item randomisation ✓

Shuffled deck approach:
- At game start, shuffle all 15 items into a deck.
- Deal 3 at a time into the tray.
- When the tray empties, deal the next 3.
- After all 15 have been seen, reshuffle and continue.

The order of requests within a tray is random — the game picks any visible tray item as the next request (correct items are removed as they go).

## Data structure

**items.js** — 15 items, each:
```js
{ id: 'yogurt', name: 'yogurt', request: 'some yogurt', image: 'item_yogurt', audio: 'request_yogurt', category: 'food' }
```

**characters.js** — 3 characters, each:
```js
{ id: 'dolly', name: 'Dolly', color: 0xFFAACC, neutral: 'dolly_neutral', needy: 'dolly_needy', happy: 'dolly_happy' }
```

**phrases.js**:
```js
const PHRASES = {
  thankYou:   ['thank_you_1', 'thank_you_2', 'thank_you_3', 'thank_you_4'],
  allDone:    'all_done',
  chosen:     ['chosen', 'chosen_2', 'chosen_3'],
  _chosenIdx: 0,
  nextChosen() { /* cycles through chosen keys in order */ },
};
```

## Responsive scaling ✓

- Reference resolution: **720 × 1280** portrait.
- `Scale.FIT` mode — preserves proportions, letterboxes on odd ratios.
- Background colour matches the room background so letterbox bars blend in.
- All elements positioned using `this.scale.width` / `this.scale.height`, never hard-coded pixels.

## Build phases ✓ (all complete)

1. **Project setup** — file structure, Phaser loading a colour-filled screen. ✓
2. **Play scene skeleton** — placeholder character + 3 draggable placeholder items, console log correct/wrong. ✓
3. **Game loop** — items.js wired up, request selection, correct removes item, wrong returns it, tray refresh. ✓
4. **Three-tries hint** — wrong counter, yellow glow + wiggle tween on correct item, next interaction counts as correct. ✓
5. **Emotions and animations** — swap character textures (neutral/needy/happy), idle bounce, celebration bounce. ✓
6. **Character select scene** — characters.js, SelectScene UI, pass chosen ID to PlayScene, localStorage persistence. ✓
7. **Audio** — load MP3s in BootScene, audio queue (handles iOS Web Audio unlock), request/thank-you/all-done/chosen audio. ✓
8. **Polish** — Scale.FIT responsiveness, long-press parent menu (mute/change character/exit), all assets complete. ✓

## Testing notes

- Test on a real phone — the touch feel is hard to judge in a desktop browser.
- Watch a real 3-year-old play after Phase 4 if possible.
- Items being too small to grab is the main risk. Bigger is almost always better.
- Audio feeling rushed is the other risk. Slight pauses between phrases help.

## Future expansions

- More items per category.
- Specific emotion faces (sleepy with droopy eyes, hungry with hand on tummy).
- Mini activities — bath time, bedtime, going for a walk.
- Per-character voices.
- Coloured tray slots that subtly hint at categories.
- A simple sticker reward album for parents to share with the child.
