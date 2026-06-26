# Take Care of Me — Game Plan

A touch-based vocabulary game for 3-year-olds. The child chooses a character (Dolly, Giraffe, or Bunny) and takes care of them by giving them what they ask for. **The game is complete.**

## Tech stack

- **Phaser 3.60** (loaded via CDN — no build step needed).
- **Vanilla JavaScript** — plain script tags loaded in order, no ES modules, no bundler.
- **Audio**: MP3 files (AI-generated).
- **Images**: WebP (converted assets) with PNG fallback for unconverted images.
- **Local development**: serve the repo root with `python -m http.server` or `npx serve .`.
- **Target**: portrait mobile browsers, `Scale.FIT` mode for responsive scaling.

## File structure

```
/                           ← repo root (game folder is the git root)
  index.html                ← loads Phaser + all scripts in order
  main.js                   ← Phaser config, scale settings, scene list
  manifest.json             ← PWA manifest
  sw.js                     ← service worker (offline caching)
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
    /images                 ← 34 images: 20 WebP + 14 PNG (character emotions, items, background)
    /audio                  ← 37 MP3s (requests, category thank-yous, wrong, sleepy, all-done, chosen)
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
- Two small non-active character thumbnails stacked in the top-left corner — tap to switch character mid-game.
- Tray of 3 items along the bottom, evenly spaced.
- Request text above the character: just the item name (e.g. "Banana") in large white text with black outline.
- Small door icon in the top-right corner — long-press (2s) to return to SelectScene.

**Game loop:**
1. On first arrival from SelectScene: character shown with no tray, chosen audio plays; tray loads after audio finishes.
2. Tray populated with 3 items from the deck.
3. A random tray item is chosen as the request. Request audio plays immediately (interrupts any prior audio). Character switches to neutral or needy (40% chance of needy).
4. Child drags an item from the tray onto the character.
5. **Correct**:
   - `currentRequest` cleared immediately so no further drags register during audio; the request text is blanked the moment the right item is given.
   - Character switches to a category-dependent reward face:
     - food / drink → `happy` + bounce, item hidden immediately (consumed).
     - comfort → `happy` + bounce, item lingers 1s then hides. *(No item currently uses the comfort category — teddy moved to play — so this is defensive for any comfort item added later.)*
     - play → 70% `jumping` / 30% `happy`, both with a bounce; item glides down to the character's feet (shrunk to ~80%, multiple toys line up around the centre) and stays there until the tray resets. Toys: book, ball, blocks, toy car, teddy.
     - sleep → `sleeping`, idle bob stopped so the character rests still (no bounce); item lingers 1s. Idle resumes on the next request.
   - All three characters have the full emotion set, so every reward face works for every character.
   - Plays a category-specific thank-you. Most categories pool the general thank-yous with their category-specific ones; **sleep is the exception** — it plays the soft `thankYouComfy` lines only, never the excited general "yay!" ones. Drags locked throughout.
   - After thank-you audio finishes, next request is picked and its audio plays (drags locked until it finishes).
6. **Wrong (1st time)**:
   - Item tweens back to its tray position.
   - Wrong-counter increments.
   - Character switches to needy.
   - Plays a random `wrong` clip immediately. Drags locked until it finishes.
7. **Wrong (2nd time)**:
   - Same as above, but replays the request audio instead of a `wrong` clip. Drags locked until it finishes.
8. **After 3 wrong tries on the same request**:
   - Yellow glow pulses behind the correct item.
   - Correct item wiggles continuously.
   - Next tap or drag on that item counts as correct and triggers full celebration.
8. Tray empty → character resets to a neutral face, all-done audio plays, then brief pause and the new tray deals. (The reset happens before the all-done line so the last item's face — e.g. `sleeping` — doesn't carry over.) Loop continues.

**Door button (long-press, 2s hold):**
- Small semi-transparent door icon in the top-right corner.
- Subtle arc draws around it during the hold.
- On completion, clears saved character and goes straight to SelectScene.

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
{ id: 'dolly', name: 'Dolly', color: 0xFFAACC, neutral: 'dolly_neutral', needy: 'dolly_needy', happy: 'dolly_happy',
  emotions: ['neutral', 'needy', 'happy', 'sleepy', 'sleeping', 'jumping'] }
```

**phrases.js**:
```js
const PHRASES = {
  thankYou:      ['thank_you_1', 'thank_you_2', 'thank_you_3', 'thank_you_5'],
  thankYouFood:  ['thank_you_food_1', ..., 'thank_you_food_4'],
  thankYouComfy: ['thank_you_comfy_1', 'thank_you_comfy_2', 'thank_you_comfy_3'],
  thankYouToys:  ['thank_you_toys_1'],
  wrong:         ['wrong_1', 'wrong_2', 'wrong_3', 'wrong_4'],
  sleepy:        ['sleepy_1', 'sleepy_2', 'sleepy_3'],
  allDone:       'all_done',
  chosen:        ['chosen', 'chosen_2', 'chosen_3'],
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
8. **Polish** — Scale.FIT responsiveness, door button (long-press to return to SelectScene), all assets complete. ✓

## Testing notes

- Test on a real phone — the touch feel is hard to judge in a desktop browser.
- Watch a real 3-year-old play after Phase 4 if possible.
- Items being too small to grab is the main risk. Bigger is almost always better.
- Audio feeling rushed is the other risk. Slight pauses between phrases help.

## To do

- **PWA icon** — create a proper 512×512 PNG showing all three characters together on the `#F2E4D4` background. Current placeholder (`dolly_happy.png`) looks fine but a group illustration would be nicer. Update `manifest.json` to reference the new file.

---

## Future expansions

- More items per category.
- Specific emotion faces (sleepy with droopy eyes, hungry with hand on tummy).
- Mini activities — bath time, bedtime, going for a walk.
- Per-character voices.
- Coloured tray slots that subtly hint at categories.
- A simple sticker reward album for parents to share with the child.
