# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**"Take Care of Me"** — a touch-based vocabulary game for 3-year-olds. The child picks a character (Dolly, Giraffe, or Bunny) and takes care of them by dragging the correct item to satisfy each request. The game is complete and fully playable.

## Running locally

No build step. Serve the repo root over HTTP (required for asset loading):

```
python -m http.server
# or
npx serve .
```

Open on a phone or phone-emulator in the browser. Desktop works for development but touch feel only tests on a real device.

## Tech stack

- **Phaser 3.60** loaded via CDN in `index.html` — no npm, no bundler
- **Vanilla JS** — plain `<script>` tags loaded in order, no ES modules, no `import`/`export`
- Everything on the **global scope** — scenes, data constants, etc.
- **720 × 1280** reference resolution, portrait, `Scale.FIT` mode
- Assets: WebP (converted images) with PNG fallback for unconverted images; MP3 audio
- **PWA** — `manifest.json` + `sw.js` service worker; installable on Android/iOS, works offline

## File structure

```
/                           ← repo root
  index.html                ← Phaser CDN + script tags in load order
  main.js                   ← Phaser config, scale settings, scene list
  manifest.json             ← PWA manifest (name, icons, display, orientation)
  sw.js                     ← service worker (pre-caches all assets for offline play)
  CLAUDE.md                 ← this file
  /scenes
    BootScene.js            ← loads all assets, progress bar, skips SelectScene if character saved
    SelectScene.js          ← character picker (3 characters, idle bounce)
    PlayScene.js            ← main game loop
  /data
    items.js                ← ITEMS array (15 items)
    characters.js           ← CHARACTERS array (3 characters; image keys + per-character `emotions` list)
    phrases.js              ← PHRASES object (category thank-you arrays, wrong, sleepy, allDone, chosen)
  /assets
    /images                 ← 34 images: 20 WebP + 14 PNG (see Asset reference below)
    /audio                  ← 38 MP3s (see Asset reference below)
  /planning_docs            ← reference docs only, not part of the game
    game-plan.md
    assets-to-create.md
    build-checklist.docx
```

## Architecture

**Scene flow:** BootScene → SelectScene → PlayScene.

- BootScene loads all assets with a progress bar. If a character is saved in `localStorage`, it skips SelectScene and goes straight to PlayScene.
- SelectScene shows the 3 characters with idle bounce animations. Tapping one triggers a scale pulse and starts PlayScene with `{ characterId, fromSelect: true }`.
- PlayScene runs the full game loop. Character choice is persisted in `localStorage`.

**Data conventions:**
- `ITEMS` — 15 items, each `{ id, name, request, image, audio, category }`
- `CHARACTERS` — 3 characters, each `{ id, name, color, neutral, needy, happy, emotions }`. `neutral/needy/happy` are image keys; `emotions` is the array of every emotion that character has artwork for (`['neutral','needy','happy','sleepy','sleeping','jumping']`). `emotions` is the single source of truth: BootScene loads `${id}_${emotion}.webp` for each entry, and `setCharEmotion` falls back to the happy face if asked for an emotion the character doesn't have.
- `PHRASES` — `{ thankYou, thankYouFood, thankYouComfy, thankYouToys, wrong, sleepy, allDone, chosen, nextChosen() }`. Category-specific thank-you arrays are selected based on the item's `category` field. `wrong` and `sleepy` arrays are used for wrong-answer and sleep-item preamble audio. `nextChosen()` cycles through chosen keys in order (not random).

**Item randomisation:** shuffled-deck approach — all 15 items shuffled at game start, dealt 3 at a time. Reshuffle when all 15 have been seen.

**Game loop (PlayScene):**
1. If arriving from SelectScene (`fromSelect: true`): show character on neutral face with no tray; play chosen audio; when it finishes, load the first tray.
2. Deal 3 items from the deck into the tray.
3. Pick a random tray item as the request; play its audio immediately via `interruptAudio`; show just the item name (e.g. "Banana") in large white text with black outline; set character to neutral or needy (40% needy). Drags are locked while request audio plays.
4. Child drags an item onto the character. Drags are silently ignored (item returns home) while any audio is playing or while no request is active.
5. Correct → immediately clears `currentRequest` to block further drags and blanks the request text; sets a category-dependent reward face; plays a category-specific thank-you; celebrates. When thank-you finishes, picks next request and plays its audio (drags locked throughout). Behaviour by category:
   - **food / drink** → item hidden immediately (consumed); `happy` face + bounce; thank-you from general + `thankYouFood`.
   - **comfort** → item lingers 1s then hides; `happy` face + bounce; thank-you from general + `thankYouComfy`. *(No item currently uses the comfort category — teddy was moved to play — so this branch is defensive for any comfort item added later.)*
   - **play** → item glides down to the character's feet (shrunk to ~80%, multiple toys line up around the centre) and stays there until the tray resets; 70% `jumping` / 30% `happy`, both with a bounce; thank-you from general + `thankYouToys`. Toys are: book, ball, blocks, toy car, **teddy**.
   - **sleep** → item lingers 1s then hides; `sleeping` face, idle bob stopped so the character rests still (no bounce, idle resumes on the next request); thank-you from `thankYouComfy` **only** (soft lines — a sleeping character never plays the excited general "yay!" thank-yous).
   All three characters have the full set of emotion images (`neutral/needy/happy/sleepy/sleeping/jumping`), so every reward face works for every character.
6. Wrong (1st time) → tween item back to tray, increment wrong counter, set character to needy, play a random `wrong` clip immediately (drags locked until it finishes).
7. Wrong (2nd time) → same as above, but replay the request audio instead of a `wrong` clip. Drags locked until it finishes.
8. 3 wrong tries → yellow glow pulse + wiggle tween on the correct item; next tap or drag on that item counts as correct.
9. Tray empty → reset the character to a neutral face, play all-done audio, then brief pause and deal the next tray. (The reset happens before the all-done line so the last item's face — e.g. `sleeping` — doesn't carry over into "All done, let's play again!")

**Audio system — two-tier:**
- `interruptAudio(key)` — stops the current sound, clears the queue, plays `key` immediately. Used for request audio (initial and wrong-answer replay) so stale audio never accumulates.
- `queueAudio(key)` — appends to the queue; plays when prior sounds finish. Used for thank-you and all-done audio.
- `queueThen(fn)` — appends a callback to the queue; fires in sequence after all prior audio has played. Used to chain game-state transitions (next request, tray load) to the end of audio.
- `_inputLocked` — set to `true` whenever a sound starts playing, `false` when the queue fully empties. All drag interactions are blocked while `_inputLocked` is true, preventing the child from interacting mid-audio.
- Mobile browsers (especially iOS) block Web Audio until the first user gesture. Phaser resumes the AudioContext on first touch and emits `unlocked`. The queue drains automatically once unlocked.

**Character switcher:** Two small thumbnails of the non-active characters sit in the top-left corner, stacked vertically. Tapping one switches the active character mid-game (updates `this.characterId`, swaps the sprite texture, saves to `localStorage`, rebuilds the switcher).

**Door button:** Small semi-transparent door icon in the top-right corner. Hold for 2 seconds — a subtle arc draws during the hold. On completion, clears the saved character from `localStorage` and goes straight to SelectScene.

**Responsive layout:** All element positions and sizes derived from `this.scale.width` / `this.scale.height`. Never hard-coded pixels for layout. `Scale.FIT` mode scales the whole canvas uniformly.

## Asset reference

**34 images** in `assets/images/`. Background and all character images are WebP; items are PNG except `item_apple`. BootScene loads characters as WebP by key convention and uses a small WebP set (`bg_room`, `item_apple`) for the rest.

WebP (20):
- `bg_room.webp`
- Each character × 6 emotions: `dolly_*`, `giraffe_*`, `bunny_*` where `* = neutral, needy, happy, sleepy, sleeping, jumping` (18 files)
- `item_apple.webp`

PNG (14 — items only):
- `item_yogurt.png`, `item_banana.png`, `item_sandwich.png`, `item_biscuit.png`
- `item_water.png`, `item_milk.png`, `item_juice.png`
- `item_blanket.png`, `item_pillow.png`
- `item_teddy.png`
- `item_book.png`, `item_ball.png`, `item_blocks.png`, `item_car.png`

**38 audio files** in `assets/audio/`:

Requests (15): `request_yogurt.mp3`, `request_banana.mp3`, `request_apple.mp3`, `request_sandwich.mp3`, `request_biscuit.mp3`, `request_water.mp3`, `request_milk.mp3`, `request_juice.mp3`, `request_blanket.mp3`, `request_pillow.mp3`, `request_teddy.mp3`, `request_book.mp3`, `request_ball.mp3`, `request_blocks.mp3`, `request_car.mp3`

Thank-yous (12): `thank_you_1–3,5.mp3` (general), `thank_you_food_1–4.mp3`, `thank_you_comfy_1–3.mp3`, `thank_you_toys_1.mp3`

Wrong answers (4): `wrong_1–4.mp3`

Sleep preambles (3): `sleepy_1–3.mp3`

Misc (4): `all_done.mp3`, `chosen.mp3`, `chosen_2.mp3`, `chosen_3.mp3`

All audio is UK English (biscuit, juice, etc.).

## PWA

`manifest.json` and `sw.js` make the game installable as a standalone app and fully playable offline.

- Install on Android: open in Chrome → "Add to Home Screen" banner, or 3-dot menu → "Add to Home Screen"
- Install on iOS: open in Safari → Share → "Add to Home Screen"
- **When updating the game:** bump `CACHE_NAME` in `sw.js` (e.g. `tcm-v1` → `tcm-v2`) so the service worker re-caches all assets on next open. No reinstall needed by the user.
- Icon placeholder: currently uses `dolly_happy.png`. Replace with a proper 512×512 square PNG (character on `#F2E4D4` background) when available.

## Key constraints

- Items must be large enough for toddler fingers — err on the side of bigger
- Audio should never feel rushed — slight pauses between phrases
- Test drag interactions on a real phone; desktop emulation is not sufficient for touch feel
