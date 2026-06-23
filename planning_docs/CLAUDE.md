# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**"Take Care of Me"** — a touch-based vocabulary game for 3-year-olds. The child picks a character (dolly, giraffe, or bunny) and takes care of them by dragging the correct item to satisfy each request.

## Running locally

No build step. Serve the `/game` directory over HTTP (required for asset loading):

```
python -m http.server
# or
npx serve game
```

Open on a phone or phone-emulator in the browser. Desktop works for development but touch feel only tests on a real device.

## Tech stack

- **Phaser 3** loaded via CDN in `index.html` — no npm, no bundler
- **Vanilla JS** — plain `<script>` tags loaded in order, no ES modules, no `import`/`export`
- Everything on the **global scope** — scenes, data constants, etc.
- **720 × 1280** reference resolution, portrait, `Scale.FIT` mode
- Assets: PNG (transparent bg for characters/items) and MP3

## File structure (to be created)

```
/game
  index.html          ← Phaser CDN + script tags in load order
  main.js             ← Phaser config, scale settings, scene list
  /scenes
    BootScene.js      ← loads all assets, progress bar
    SelectScene.js    ← character picker
    PlayScene.js      ← main game loop
  /data
    items.js          ← ITEMS array (15 items)
    characters.js     ← CHARACTERS array (3 characters × 3 emotion image keys)
    phrases.js        ← PHRASES object (thankYou variants, allDone, chosen)
  /assets
    /images
    /audio
```

## Architecture

**Scene flow:** BootScene → SelectScene → PlayScene (chosen character passed via scene data).

**Data conventions:**
- `items.js` exports `const ITEMS = [{ id, name, image, audio, category }, ...]` — 15 items total
- `characters.js` exports `const CHARACTERS = [{ id, name, neutral, needy, happy }, ...]` — image keys for each emotion state
- `phrases.js` exports `const PHRASES = { thankYou: [...], allDone, chosen }` — audio keys

**Item randomisation:** shuffled-deck approach — shuffle all 15 into a deck at game start, deal 5 at a time. Reshuffle when all 15 have been seen. Never pick randomly each round.

**Game loop (PlayScene):**
1. Populate tray with 5 items from the deck
2. Pick a random tray item as the request, play its audio
3. Child drags an item onto the character
4. Correct → remove from tray, play thank-you, brief celebration, then next request
5. Wrong → tween item back to tray, increment wrong counter, repeat request audio
6. 3 wrong tries → tween a glow/wiggle on the correct item; next tap/drag counts as correct
7. Tray empty → play all-done audio, deal next 5 from deck, loop

**Responsive layout:** position all elements using `this.scale.width` / `this.scale.height`, never hard-coded pixels.

## Build phases

Work through these in order — each produces something runnable:

1. **Project setup** — file structure, Phaser loading a colour-filled screen
2. **Play scene skeleton** — placeholder character + 5 draggable placeholder items, console log correct/wrong
3. **Game loop** — wire up `items.js`, request selection, correct removes item, wrong returns it, tray refresh
4. **Three-tries hint** — wrong counter, glow/wiggle tween on 3rd wrong, treat next interaction as correct
5. **Emotions and animations** — swap character textures (neutral/needy/happy), idle bounce, celebration bounce
6. **Character select scene** — `characters.js`, SelectScene UI, pass chosen ID to PlayScene
7. **Audio** — load MP3s in BootScene, play request/thank-you/all-done/chosen, simple audio queue to prevent overlap
8. **Polish** — real-device scale tuning, long-press parent menu (top-right, 2s hold) with mute/change character/exit

## Asset reference

25 images and 20 audio files required — see `assets-to-create.md` for the full list with filenames, descriptions, and phrase scripts. UK English throughout (biscuit, juice, lovely, etc.).

## Key constraints

- Items need to be large enough for toddler fingers — err on the side of bigger
- Add slight pauses between phrases in audio; it should never feel rushed
- Test drag interactions on a real phone before considering touch behaviour done
