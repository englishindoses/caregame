# Take Care of Me — Game Plan

A touch-based vocabulary game for 3-year-olds. The child chooses a character (dolly, giraffe, or bunny) and takes care of them by giving them what they ask for.

## Tech stack

- **Phaser 3** (loaded via CDN — no build step needed).
- **Vanilla JavaScript** — plain script tags loaded in order, no ES modules, no bundler.
- **Audio**: MP3 files (AI-generated first, recorded by hand later if needed).
- **Images**: PNG files (generated with ChatGPT).
- **Local development**: serve with `python -m http.server` or `npx serve` to allow asset loading.
- **Target**: portrait mobile browsers, responsive scaling for varying phone sizes.

## File structure

```
/game
  index.html              ← loads Phaser + all scripts in order
  main.js                 ← Phaser config, scale settings, scene list
  /scenes
    BootScene.js          ← loads all images and audio, shows loading screen
    SelectScene.js        ← character picker
    PlayScene.js          ← main game loop
  /data
    items.js              ← all items (id, name, image key, audio key, category)
    characters.js         ← all characters (id, name, image keys)
    phrases.js            ← shared phrases (thank you, all done, etc.)
  /assets
    /images               ← character and item PNGs, background
    /audio                ← request and response MP3s
```

All scripts are loaded via `<script>` tags in `index.html`. Each file defines classes or constants on the global scope. No `import`/`export`. This keeps the project simple to run and easy for Claude Code to edit one file at a time.

## Scene 1 — Boot

Loads all assets with a simple progress bar. Shows once at startup. Transitions to SelectScene when done.

## Scene 2 — Select

- Title at the top: "Take Care of Me!".
- 3 characters displayed side by side, each gently bouncing (idle animation).
- Tap a character → it does a happy bounce, plays the "Yay! Let's play!" audio, then transitions to PlayScene with the chosen character ID.

## Scene 3 — Play (the main game)

**Layout:**
- Cozy bedroom background.
- Chosen character centered in the upper portion of the screen.
- Tray of 5 items along the bottom, evenly spaced.
- Hidden long-press corner (top right, 2-second hold) for parent menu.

**Game loop:**
1. Round starts. Tray is populated with 5 random items from the pool.
2. Character switches to `needy` face. A random item from the tray is chosen as the request. The matching request audio plays (e.g., "I'm hungry. I want some yogurt please.").
3. Child drags an item from the tray onto the character.
4. **Correct**:
   - Character switches to `happy` face.
   - Plays a "thank you" audio (random from the variants).
   - Brief celebration animation (bounce or sparkle).
   - Item disappears from the tray.
   - After ~1.5 seconds, character returns to `needy` and asks for the next item.
5. **Wrong**:
   - Item gently returns to the tray (tween back).
   - Wrong-counter increments.
   - Character repeats the same request audio.
6. **After 3 wrong tries on the same request**:
   - The correct item gently glows and wiggles (Phaser tween — no image needed).
   - When the child drags it (or even just taps it), it counts as correct and triggers the full celebration.
7. When the tray is empty, character plays the "All done! Let's play again!" audio, tray refreshes with 5 new items (see "Item randomisation" below), loop continues.

## Item randomisation

Use a **shuffled deck** approach rather than picking 5 at random each round:

- At game start, shuffle all 15 items into a deck.
- Deal the top 5 into the tray.
- When the tray empties, deal the next 5.
- After all 15 have been seen, reshuffle the full deck and continue.

This guarantees every item shows up regularly and prevents the same item appearing in back-to-back rounds, which keeps the game feeling fresh for the child.

The order of requests **within** a round is also random — the game picks any of the 5 tray items as the next request, never the same one twice in a round (since correct items are removed).

## Data structure

The point of these files is that adding new items, characters, or phrases later is a one-line change with no risk to game logic.

**items.js example:**

```js
const ITEMS = [
  { id: 'yogurt',  name: 'yogurt',  image: 'item_yogurt',  audio: 'request_yogurt',  category: 'food' },
  { id: 'banana',  name: 'banana',  image: 'item_banana',  audio: 'request_banana',  category: 'food' },
  // ... etc.
];
```

**characters.js example:**

```js
const CHARACTERS = [
  { id: 'dolly',   name: 'Dolly',   neutral: 'dolly_neutral',   needy: 'dolly_needy',   happy: 'dolly_happy' },
  { id: 'giraffe', name: 'Giraffe', neutral: 'giraffe_neutral', needy: 'giraffe_needy', happy: 'giraffe_happy' },
  { id: 'bunny',   name: 'Bunny',   neutral: 'bunny_neutral',   needy: 'bunny_needy',   happy: 'bunny_happy' },
];
```

**phrases.js example:**

```js
const PHRASES = {
  thankYou: ['thank_you_1', 'thank_you_2', 'thank_you_3'],
  allDone: 'all_done',
  chosen: 'chosen',
};
```

## Responsive scaling

Phaser 3's Scale Manager handles this:

- Design at a reference resolution of **720 × 1280** (portrait).
- Use `Scale.FIT` mode so the game preserves proportions and letterboxes on odd ratios.
- Set background colour to match the room background so any letterbox bars blend in.
- Lock orientation to portrait via CSS / meta tags in `index.html`.
- Position all elements using `this.scale.width` and `this.scale.height` rather than hard-coded pixel values.

## Build order for Claude Code

Each phase produces something playable, so you can test as you go.

**Phase 1 — Project setup.**
- Create the file structure.
- `index.html` loads Phaser from CDN and a single `main.js`.
- `main.js` boots a single empty scene that fills the screen with a colour.
- Confirm it runs in a phone browser.

**Phase 2 — Play scene skeleton.**
- Hardcode one character on screen using a placeholder image.
- Hardcode 5 items in the tray using placeholders.
- Make items draggable.
- When an item is dropped on the character, log "correct" or "wrong" to console.

**Phase 3 — Game loop.**
- Add `items.js` data file.
- Pick a random request from the tray, store the target item id.
- Wire up correct = remove item from tray; wrong = return item.
- When tray empties, refresh with 5 new random items.

**Phase 4 — Three-tries hint.**
- Add wrong-counter per request.
- On the 3rd wrong, tween a glow/wiggle on the correct item.
- Treat the next tap on the correct item as success.

**Phase 5 — Emotions and animations.**
- Swap character textures between neutral, needy, and happy.
- Add idle bounce when neutral (gentle vertical tween, loops).
- Add celebration bounce on correct.

**Phase 6 — Character select scene.**
- Add `characters.js` data file.
- Build SelectScene with the 3 characters bouncing.
- Pass chosen character ID to PlayScene via scene data.

**Phase 7 — Audio.**
- Load all MP3s in BootScene.
- Play request audio when a need appears.
- Play thank you on correct, all done on tray empty, chosen on select.
- Add a small audio queue so phrases don't overlap.

**Phase 8 — Polish.**
- Tune scale settings for real phone testing.
- Add long-press parent menu (top right corner) with mute, change character, exit.
- Final asset swap if any placeholders remain.

## Testing notes

- Test on a real phone early — the touch feel is hard to judge in a desktop browser.
- Watch a real 3-year-old play after Phase 4 if possible. You'll learn more in 5 minutes than in an hour of solo testing.
- Watch for items being too small to grab. Bigger is almost always better.
- Watch for the audio feeling rushed. Add slight pauses between phrases.

## Future expansions (after the core works)

- More items per category.
- Specific emotion faces (sleepy with droopy eyes, hungry with hand on tummy).
- Mini activities — bath time, bedtime, going for a walk.
- Per-character voices.
- Coloured tray slots that subtly hint at categories.
- A simple sticker reward album for parents to share with the child.
