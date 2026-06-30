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
- **Arcade Physics** enabled in `main.js` (no gravity by default) — used by the Catch mini-game (no gravity) and the Tidy mini-game (per-scene gravity for falling toys)
- **Vanilla JS** — plain `<script>` tags loaded in order, no ES modules, no `import`/`export`
- Everything on the **global scope** — scenes, data constants, shared helpers (e.g. `addDoorButton`)
- **720 × 1280** reference resolution, portrait, `Scale.FIT` mode
- Assets: WebP (converted images) with PNG fallback for unconverted images; MP3 audio
- **Self-hosted web font** — Quicksand (OFL) at `assets/fonts/quicksand-700.woff2`, declared via `@font-face` in `index.html` and awaited in BootScene before scenes render (Phaser draws text to canvas, so the font must be loaded first). Used for the Tidy toy-name reveal.
- **PWA** — `manifest.json` + `sw.js` service worker; installable on Android/iOS, works offline. Service worker is **network-first for code** (HTML/JS) and **cache-first for media** (images/audio/fonts) — see **PWA** below

## File structure

```
/                           ← repo root
  index.html                ← Phaser CDN + script tags in load order
  main.js                   ← Phaser config, scale settings, Arcade Physics, scene list
  manifest.json             ← PWA manifest (name, icons, display, orientation)
  sw.js                     ← service worker (pre-caches all assets for offline play)
  CLAUDE.md                 ← this file
  /scenes
    BootScene.js            ← loads all assets, awaits the web font, progress bar, skips SelectScene if character saved; ?mini dev shortcut
    SelectScene.js          ← character picker (3 characters, idle bounce)
    PlayScene.js            ← main game loop; breaks to the mini-game after 3 cleared trays
    MiniGameSelectScene.js  ← "What shall we play?" screen (tappable mini-game tiles)
    CatchScene.js           ← Catch mini-game (Arcade Physics, no gravity)
    TidyScene.js            ← Tidy Time mini-game (Arcade Physics + gravity)
    doorButton.js           ← shared addDoorButton(scene) helper (hold-to-exit), used by all mini-game scenes
  /data
    items.js                ← ITEMS array (15 items)
    characters.js           ← CHARACTERS array (3 characters; image keys + per-character `emotions` list)
    phrases.js              ← PHRASES object (category thank-you arrays, wrong, sleepy, allDone, chosen, + Catch/Tidy mini-game arrays)
    minigames.js            ← MINIGAMES array (mini-game tiles for the select screen; catch + tidy)
  /assets
    /images                 ← 36 images: 20 WebP + 16 PNG (see Asset reference below)
    /audio                  ← 52 MP3s (see Asset reference below)
    /fonts                  ← quicksand-700.woff2 (self-hosted, for offline)
  /planning_docs            ← reference docs only, not part of the game
    game-plan.md, changelog.md, assets-to-create.md
    ball-game-plan.md, mini-game-assets.md           (Catch design + assets)
    tidy-game-plan.md, tidy-game-assets.md           (Tidy design + assets)
    build-checklist.docx
```

## Architecture

**Scene flow:** BootScene → SelectScene → PlayScene → (after 3 trays) → MiniGameSelectScene → (CatchScene | TidyScene) → PlayScene.

- BootScene loads all assets with a progress bar. If a character is saved in `localStorage`, it skips SelectScene and goes straight to PlayScene. The `?mini` URL flag jumps straight to MiniGameSelectScene (dev shortcut — remove before final release).
- SelectScene shows the 3 characters with idle bounce animations. Tapping one triggers a scale pulse and starts PlayScene with `{ characterId, fromSelect: true }`.
- PlayScene runs the full game loop. Character choice is persisted in `localStorage`. After 3 trays are cleared it breaks to the mini-game (see **Mini-games** below) and resumes afterwards.

**Data conventions:**
- `ITEMS` — 15 items, each `{ id, name, request, image, audio, category }`
- `CHARACTERS` — 3 characters, each `{ id, name, color, neutral, needy, happy, emotions }`. `neutral/needy/happy` are image keys; `emotions` is the array of every emotion that character has artwork for (`['neutral','needy','happy','sleepy','sleeping','jumping']`). `emotions` is the single source of truth: BootScene loads `${id}_${emotion}.webp` for each entry, and `setCharEmotion` falls back to the happy face if asked for an emotion the character doesn't have.
- `PHRASES` — main-game `{ thankYou, thankYouFood, thankYouComfy, thankYouToys, wrong, sleepy, allDone, chosen, nextChosen() }`, the **Catch** arrays `{ playInvite, playCatch, catchExcite, playerCatch, playTired }`, and the **Tidy** keys `{ tidyChosen (tile line, `tidy_chosen_1`), tidyOpening (in-scene, `tidy_chosen_2/3`, cycled via `nextTidyOpening()`), tidyName (object keyed by toy id → `item_name_*`), inItGoes, nextOne, tidyOops, allTidy }`. Category thank-you arrays are picked by the item's `category`. `nextChosen()` / `nextTidyOpening()` cycle (not random). BootScene loads the `tidyName` object via `Object.values(...)`.
- `MINIGAMES` — array of mini-game tiles for MiniGameSelectScene, each `{ id, name, image, chosenGroup, scene, tileScale? }`. `chosenGroup` is the PHRASES key for the "let's play" line; `scene` is the scene to launch; optional `tileScale` enlarges that tile (tidy uses 1.4). Both `catch` and `tidy` are wired; the select-screen layout adapts to up to 4 tiles, and a tile whose image is missing renders a coloured placeholder box.

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

**Door button (hold-to-exit):** Small semi-transparent door icon in the top-right corner. Hold for 2 seconds — a subtle arc draws during the hold. On completion, clears the saved character from `localStorage` and goes straight to SelectScene. PlayScene has its own copy; the **mini-game scenes** (Catch, Tidy, MiniGameSelect) call the shared `addDoorButton(this)` from `scenes/doorButton.js`.

**Responsive layout:** All element positions and sizes derived from `this.scale.width` / `this.scale.height`. Never hard-coded pixels for layout. `Scale.FIT` mode scales the whole canvas uniformly.

## Mini-games

After PlayScene clears 3 trays (`traysCleared` counter), it starts `MiniGameSelectScene` instead of dealing the next tray. Returning to PlayScene with `{ fromMinigame: true }` resumes the main loop without replaying the chosen-audio intro (it falls through to the normal "deal a tray" path).

**MiniGameSelectScene** — "What shall we play?" screen on the same bedroom background. The chosen character bobs small in the bottom-left. Each entry in `MINIGAMES` becomes a tappable tile; the **tile image itself is the hit target** (its full bounding box, so a child can tap anywhere on it), and a missing image renders a coloured placeholder box. The grid adapts for 1–4 tiles. Tapping a tile plays its `chosenGroup` line, then starts that mini-game's scene. Has the hold-to-exit door button.

**CatchScene** — the child and the character take turns throwing a ball. No failure states. Key mechanics:
- **Arcade Physics, no gravity** ("top-down" feel) so throws drift to the character and stay forgiving for a toddler.
- **Throw = drag-and-release:** press the ball, drag it (physics body disabled while dragging so it follows the finger), release — the release direction and speed become the throw velocity. A near-still release gives a gentle lob toward the character. Sideways flicks bounce off the walls.
- **Floor / "Option B" settle:** the physics world is bounded at the rug line (`FLOOR_Y`, default `H*0.80`) so the ball can rest on the floor but never sink below. When a throw runs out of energy it does a quick accelerating drop (`settleToFloor`) onto the rug instead of freezing mid-air, then becomes grabbable again. A soft shadow on the rug fades as the ball lifts.
- **Catch detection:** each frame, if the moving ball passes within `CATCH_RADIUS` (150px) of the character it's caught → character plays `jumping`, plays `thank_you_toys_1`, holds ~800ms, then throws the ball back (a tween, not physics) down to the rug in front of the child (`playerCatch` → catch counter increments).
- **Exit:** after `TARGET_CATCHES` (5) the next catch ends the game — character goes `sleepy`, plays a `playTired` line if recorded, **else falls back to a real `sleepy_*` line** so it's never silent, then returns to PlayScene. Also has the hold-to-exit door button.
- **Phases:** `opening | idle | flying | settling | held | throwBack | ended`. Throws are only accepted in `idle` (and when `_inputLocked` is false).
- **Boing:** on every wall bounce — plays a random of `boing_1`/`boing_2` (recorded); if neither exists, a soft "doink" is **synthesized** via the Web Audio API. Respects mute.

**TidyScene** — the child drags all 5 toys (`item_book/ball/blocks/car/teddy`) into the toy box. Arcade Physics **with gravity** in this scene. Key mechanics:
- **Toys** rain in from above and each settles at its own random height across a rug band (top = the character's feet, bottom `RUG_BOTTOM`), so they scatter. **Live perspective:** a toy's size tracks its current Y (lower = nearer = bigger). Dropped off the box, a toy **rests where left** on the rug; only a toy released *above* the rug falls under gravity.
- **Toy box** uses `toy_box_closed`/`toy_box_open` art: slides in closed, opens after landing, closes again on the last toy. A generous `BOX_RADIUS` hit zone.
- **Drop reveal (tap-to-continue):** on a valid drop → plop SFX; the toy lifts onto the box and stays visible; its **name appears ~3× big, centred, and hovers** (Quicksand, auto-fits width). Other toys are drag-locked. A **screen tap** pops the name + toy and continues. `in_it_goes_1` plays *before* the name and `in_it_goes_2` (which wobbles a random remaining toy) plays *after* it — each on only **2–3 of the 4** non-final drops (independent schedules).
- **Final toy:** name comes up first → tap → box closes, **star-particle explosion** (generated texture) + celebration sound (synth sparkle, or `celebrate.mp3`) → an "all done" line (`all_tidy_*` if recorded, else `all_done`/`well_done_1`) → back to PlayScene.
- **Audio is interrupt-based, never queued, and never locks input** in this scene — a briskly-tidying toddler is never made to wait.

**Mini-game audio — partially recorded.** Present: Tidy's `tidy_chosen_1/2/3`, `item_name_*`, `in_it_goes_1/2`, `next_one_1`, `well_done_1`, and Catch's `boing_1/2`. Still missing (run on synth/timers/fallbacks): all Catch voice (`play_invite/play_catch/catch_excite/player_catch/play_tired`), and Tidy's `tidy_opening_*` (superseded by `tidy_chosen_2/3`), `tidy_oops_*`, `all_tidy_*`, `in_it_goes_3`, `plop`, `celebrate`. BootScene attempts all keys (a `loaderror` is logged + ignored) and the code no-ops / falls back on any missing clip. When recording more: drop files in `assets/audio/`, and (for offline pre-cache) add paths to `sw.js` + bump `CACHE_NAME`.

## Asset reference

**36 images** in `assets/images/`. Background and all character images are WebP; items + toy box are PNG except `item_apple`. BootScene loads characters as WebP by key convention and uses a small WebP set (`bg_room`, `item_apple`) for the rest.

WebP (20):
- `bg_room.webp`
- Each character × 6 emotions: `dolly_*`, `giraffe_*`, `bunny_*` where `* = neutral, needy, happy, sleepy, sleeping, jumping` (18 files)
- `item_apple.webp`

PNG (16 — items + toy box):
- `item_yogurt.png`, `item_banana.png`, `item_sandwich.png`, `item_biscuit.png`
- `item_water.png`, `item_milk.png`, `item_juice.png`
- `item_blanket.png`, `item_pillow.png`
- `item_teddy.png`
- `item_book.png`, `item_ball.png`, `item_blocks.png`, `item_car.png`
- `toy_box_closed.png`, `toy_box_open.png` (Tidy mini-game; also the Tidy select tile)

The Tidy celebration stars are **generated in code** (no image asset). The Tidy toy-name text uses the self-hosted font `assets/fonts/quicksand-700.woff2`.

**52 audio files** in `assets/audio/`:

Requests (15): `request_yogurt.mp3`, `request_banana.mp3`, `request_apple.mp3`, `request_sandwich.mp3`, `request_biscuit.mp3`, `request_water.mp3`, `request_milk.mp3`, `request_juice.mp3`, `request_blanket.mp3`, `request_pillow.mp3`, `request_teddy.mp3`, `request_book.mp3`, `request_ball.mp3`, `request_blocks.mp3`, `request_car.mp3`

Thank-yous (12): `thank_you_1–3,5.mp3` (general), `thank_you_food_1–4.mp3`, `thank_you_comfy_1–3.mp3`, `thank_you_toys_1.mp3`

Wrong answers (4): `wrong_1–4.mp3`

Sleep preambles (3): `sleepy_1–3.mp3`

Misc (4): `all_done.mp3`, `chosen.mp3`, `chosen_2.mp3`, `chosen_3.mp3`

Catch mini-game (2): `boing_1.mp3`, `boing_2.mp3` (wall-bounce SFX)

Tidy mini-game (12): `tidy_chosen_1–3.mp3`, `item_name_ball/book/blocks/car/teddy.mp3`, `in_it_goes_1.mp3`, `in_it_goes_2.mp3`, `next_one_1.mp3`, `well_done_1.mp3`

All audio is UK English (biscuit, juice, etc.). For the full list of what each clip says (transcribed from the audio) and what's still to record, see `planning_docs/assets-to-create.md`.

## PWA

`manifest.json` and `sw.js` make the game installable as a standalone app and fully playable offline.

- Install on Android: open in Chrome → "Add to Home Screen" banner, or 3-dot menu → "Add to Home Screen"
- Install on iOS: open in Safari → Share → "Add to Home Screen"
- **Caching strategy (`sw.js` fetch handler):** **network-first for code** (HTML/JS) so a normal online reload always gets the latest code; **cache-first for everything else** (images/audio/fonts) for speed. The pre-cache list (`ASSETS`) + `CACHE_NAME` still matter for offline: on a `CACHE_NAME` change a new worker installs, pre-caches `ASSETS`, and deletes old caches.
- **When adding media (images/audio):** add the path to `ASSETS` in `sw.js` and **bump `CACHE_NAME`** (currently `tcm-v7`) so installed apps pre-cache it for offline. Code-only changes don't strictly need a bump (network-first), but bumping is harmless. Caveat: `cache.addAll` rejects the whole install if any listed file 404s — only list files that exist (the unrecorded mini-game audio is intentionally omitted).
- **Deployment:** GitHub Pages serves the PWA from the `main` branch of `englishindoses/caregame` → https://englishindoses.github.io/caregame/ . Pushing to `main` deploys; `?mini` on the URL jumps straight to the mini-game select for testing.
- Icon placeholder: currently uses `dolly_happy.png`. Replace with a proper 512×512 square PNG (character on `#F2E4D4` background) when available.

## Key constraints

- Items must be large enough for toddler fingers — err on the side of bigger
- Audio should never feel rushed — slight pauses between phrases
- Test drag interactions on a real phone; desktop emulation is not sufficient for touch feel
