## Home hub and parent sound settings (2026-10-14)

- Home (`SelectScene`) now opens Care, Memory, Catch, Tidy Time and Drive directly. The bottom plushie selector changes the saved character without launching care. Game pictures, labels and their surrounding areas are tappable. Full and mini menus use the same game order.
- The separate All Games menu is replaced by Home; `AllGamesScene` remains only as a compatibility redirect. Doors offer Home and Care, omitting the current destination. Care retains its two-tray break and short mini modes.
- Hold Home's settings gear for two seconds. Parent settings save overall volume (`tcm_volume`), care-request sound (`tcm_request_sound`) and all other sounds (`tcm_other_sound`). Request sound controls `request_*` recordings for every plushie; thanks, praise, instructions, names and effects are other sounds. The quick master mute remains independent.
- `scenes/soundSettings.js` controls recorded sound categories, browser speech volume and synthesised effects. Silent recordings retain their completion callbacks; disabled browser speech still completes continuations. Service-worker cache is `tcm-v15`.
- Checks: `tests/home-settings-smoke.py` (also `--laptop`), updated cache/full-game checks and `tests/sound-settings.test.js`. Real-device audio/touch testing remains pending.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Full versions of existing games (2026-10-14)

- All Games now offers Memory, Catch, Tidy and Drive, each launched with `mode: 'full'`.
- Full Catch continues beyond five returns. Full Drive has no automatic ending. Full Tidy celebrates each cleared batch, then restarts with five toys and the current plushie.
- Opening these games without full mode preserves their existing short care-break behaviour. Shared doors remain the way to leave full games.
- All Games loads its closed toy-box tile on demand. Existing Tidy box art, recorded Tidy lines and Catch bounce effects are now precached; cache name is `tcm-v14`.
- Further game imports are paused at the user's request. Real-phone playtesting remains pending.

## Current implementation after the Memory merge (2026-10-14)

This section reflects the current code and supersedes older descriptions below where they differ.

- Home's All Games button uses a large generated ball/puzzle/blocks illustration (`all_games_icon.webp`), a rounded sage-and-cream panel and press feedback. SelectScene loads the picture; it is precached for offline use.
- Every screen has the shared speaker/mute button (`scenes/muteButton.js`), including Home and loading. It saves `tcm_mute`, cancels browser speech without losing its continuation, and routes synthesized effects through Phaser's master mute output. The Tidy mini-menu tile uses the closed toy-box image, now precached.
- Normal boot always opens Home (`SelectScene`), with the original three plushie choices and a new All Games button. `?mini` opens the mini-game menu; `?memory` opens full Memory for development.
- The care game's request, reward, hint, audio and deck rules are unchanged. Its existing break remains after **two trays**, not three.
- `AllGamesScene` uses `ALL_GAMES` from `data/allgames.js` and currently offers only full Memory. `MINIGAMES` now offers Catch, Tidy, Drive and short Memory.
- `MemoryScene` uses the existing 15 item images, existing plushies, recorded toy-name/praise/sleepy audio, and whole-line British browser voices for new instructions. Its new warm play-mat background is `assets/images/bg_memory.webp`; All Games reuses `bg_room`.
- Full Memory retains the source game's ladder: guided boards of 4, 4, 6, 6 cards; level 2 has 4 cards with a 2-second preview; level 3 has 4 face-down cards; level 4 has 6 cards with a preview. Five cleared sets advance a memory level; four mismatches in a set step down (never below level 2). Four flips without a match reveal unmatched cards briefly. `data/memory.js` contains these rules.
- Memory praise alternates the recorded `well_done_1` (Well done!) and `thank_you_5` (You're the best!) for matches and set celebrations, starting with "You're the best!".
- Only full mode saves `tcm_memory_level`. Mini mode always uses level 3 (four cards initially face down, no opening preview), plays three sets, celebrates, becomes sleepy and returns to care. It never advances or lowers the full-game level. Board/set counters reset when full Memory is reopened, as in the source game.
- All screens except Home share `addDoorButton(scene)`: hold for 2 seconds, then choose Back to Care Game / Back to Games Menu / Back to Home. The current destination is omitted. Outside taps dismiss the menu. Leaving preserves the selected plushie. Scene timers and physics pause while the menu is open.
- `scenes/characterSwitcher.js` shares the existing stacked corner thumbnails across scenes with a plushie. `scenes/speech.js` owns recorded/browser voice playback with mute, fallback timers and shutdown cleanup. `scenes/memoryArt.js` creates a two-card Memory tile from the existing ball art.
- Drive currently stays **portrait**, uses draggable wiper/indicator stalks and automatically returns after `CAR_CONFIG.AUTO_END_MS` (60000). Its former tap menu has been replaced with the shared hold door.
- New scripts are registered in `index.html`/`main.js` and precached in `sw.js`, now **tcm-v13**, with the Memory background and shared name/praise recordings. Existing Phaser CDN/icon references were left unchanged.
- Verification: `node --test tests/memory-rules.test.js tests/speech.test.js`; browser checks in `tests/merge-smoke.py` and `tests/cache-check.py` use Python Playwright and a test-only exact Phaser 3.60.0 bundle. Real-phone touch/voice testing remains necessary.
- The `preschooler-game` sibling was read as a source reference and must remain unchanged. Later imports (Listen & Tap, Odd One Out, Patterns) are not in this merge.

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
- **720 × 1280** reference resolution, portrait, `Scale.FIT` mode. Exception: the **Little Driver** (car) mini-game flips the game to **1280 × 720 landscape** on entry (`this.scale.setGameSize`) and restores portrait on exit.
- **Asset loading is split:** BootScene loads only the **main-game** assets; each **mini-game loads its own assets on demand** in its scene's `preload()` (and the mini-game select screen loads its tile art + "let's play" lines). Boot stays lean; a mini-game only pays for its assets when the child opens it. Payloads are small enough that no loading screen is needed on the mini-game scenes.
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
    BootScene.js            ← loads the main-game assets only, awaits the web font, progress bar, skips SelectScene if character saved; ?mini dev shortcut
    SelectScene.js          ← character picker (3 characters, idle bounce)
    PlayScene.js            ← main game loop; breaks to the mini-game after 3 cleared trays
    MiniGameSelectScene.js  ← "What shall we play?" screen (tappable mini-game tiles); preloads tile art + "let's play" lines
    CatchScene.js           ← Catch mini-game (Arcade Physics, no gravity); preloads its own audio
    TidyScene.js            ← Tidy Time mini-game (Arcade Physics + gravity); preloads its own art + audio
    CarScene.js             ← Little Driver mini-game (landscape; steer/horn/wipers/indicators); preloads its own art + audio
    doorButton.js           ← shared addDoorButton(scene) helper (hold-to-exit), used by Catch, Tidy, MiniGameSelect (Car has its own exit menu)
  /data
    items.js                ← ITEMS array (15 items)
    characters.js           ← CHARACTERS array (3 characters; image keys + per-character `emotions` list)
    phrases.js              ← PHRASES object (category thank-you arrays, wrong, sleepy, allDone, chosen, + Catch/Tidy/Car mini-game arrays)
    minigames.js            ← MINIGAMES array (mini-game tiles for the select screen; catch + tidy + car)
    car-config.js           ← CAR_CONFIG tunables for the Little Driver mini-game (wheel angle, wiper/indicator timing, parallax)
  /assets
    /images                 ← 38 images: 22 WebP + 16 PNG (see Asset reference below)
    /audio                  ← 52 MP3s (see Asset reference below)
    /fonts                  ← quicksand-700.woff2 (self-hosted, for offline)
  /planning_docs            ← reference docs only, not part of the game
    game-plan.md, changelog.md, assets-list.md
    ball-game-plan.md, mini-game-assets.md           (Catch design + assets)
    tidy-game-plan.md, tidy-game-assets.md           (Tidy design + assets)
    car-game-plan.md                                 (Little Driver design)
    build-checklist.docx
```

## Architecture

**Scene flow:** BootScene → SelectScene → PlayScene → (after 3 trays) → MiniGameSelectScene → (CatchScene | TidyScene | CarScene) → PlayScene.

- BootScene loads the **main-game** assets with a progress bar (mini-game assets are lazy-loaded — see **Mini-games**). If a character is saved in `localStorage`, it skips SelectScene and goes straight to PlayScene. The `?mini` URL flag jumps straight to MiniGameSelectScene (dev shortcut — remove before final release).
- SelectScene shows the 3 characters with idle bounce animations. Tapping one triggers a scale pulse and starts PlayScene with `{ characterId, fromSelect: true }`.
- PlayScene runs the full game loop. Character choice is persisted in `localStorage`. After 3 trays are cleared it breaks to the mini-game (see **Mini-games** below) and resumes afterwards.

**Data conventions:**
- `ITEMS` — 15 items, each `{ id, name, request, image, audio, category }`
- `CHARACTERS` — 3 characters, each `{ id, name, color, neutral, needy, happy, emotions }`. `neutral/needy/happy` are image keys; `emotions` is the array of every emotion that character has artwork for (`['neutral','needy','happy','sleepy','sleeping','jumping']`). `emotions` is the single source of truth: BootScene loads `${id}_${emotion}.webp` for each entry, and `setCharEmotion` falls back to the happy face if asked for an emotion the character doesn't have.
- `PHRASES` — main-game `{ thankYou, thankYouFood, thankYouComfy, thankYouToys, wrong, sleepy, allDone, chosen, nextChosen() }`, the **Catch** arrays `{ playInvite, playCatch, catchExcite, playerCatch, playTired }`, and the **Tidy** keys `{ tidyChosen (tile line, `tidy_chosen_1`), tidyOpening (in-scene, `tidy_chosen_2/3`, cycled via `nextTidyOpening()`), tidyName (object keyed by toy id → `item_name_*`), inItGoes, nextOne, tidyOops, allTidy }`, and the **Car** key `{ driveChosen (tile line, `drive_chosen_*`, unrecorded so silent) }`. Category thank-you arrays are picked by the item's `category`. `nextChosen()` / `nextTidyOpening()` cycle (not random). The `tidyName` object is loaded via `Object.values(...)` in TidyScene's preload.
- `MINIGAMES` — array of mini-game tiles for MiniGameSelectScene, each `{ id, name, image, chosenGroup, scene, tileScale?, imageSrc? }`. `chosenGroup` is the PHRASES key for the "let's play" line; `scene` is the scene to launch; optional `tileScale` enlarges that tile (tidy uses 1.4); optional `imageSrc` is the path for a tile image that **isn't** a main-game asset (tidy's `toy_box_closed`), which the select screen loads itself (item-image tiles like the ball and car are already in memory). `catch`, `tidy` and `car` are all wired; the select-screen layout adapts to up to 4 tiles, and a tile whose image is missing renders a coloured placeholder box. The `car` tile reuses the existing `item_car` art.
- `CAR_CONFIG` (in `data/car-config.js`) — tunables for the Little Driver mini-game: `WHEEL_MAX_DEG`, `WHEEL_RETURN_MS`, `WIPER_CYCLES`, `WIPER_SWEEP_MS`, `INDICATOR_TIMEOUT_MS`, `INDICATOR_TICK_MS`, `PARALLAX_MAX_PX`.

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

**Door button (hold-to-exit):** Small semi-transparent door icon in the top-right corner. Hold for 2 seconds — a subtle arc draws during the hold. On completion, clears the saved character from `localStorage` and goes straight to SelectScene. PlayScene has its own copy; the **Catch, Tidy and MiniGameSelect** scenes call the shared `addDoorButton(this)` from `scenes/doorButton.js`. **CarScene is the exception** — its top-right door **taps to open an exit menu** (Main Game / Mini-Game Select / Character Select) rather than hold-to-exit, since the car has more places to return to.

**Screen target:** phone **portrait** is the priority — 720 × 1280 reference resolution with `Scale.FIT`, which scales the whole canvas uniformly. Derive layout from `this.scale.width` / `this.scale.height` (the Car mini-game swaps to 1280 × 720 landscape, so read those at runtime rather than assuming portrait).

## Mini-games

After PlayScene clears 3 trays (`traysCleared` counter), it starts `MiniGameSelectScene` instead of dealing the next tray. Returning to PlayScene with `{ fromMinigame: true }` resumes the main loop without replaying the chosen-audio intro (it falls through to the normal "deal a tray" path).

**Per-scene asset loading.** No mini-game assets load at boot. Each mini-game scene's `preload()` loads exactly its own assets (guarded by `!this.cache.audio.exists` / `!this.textures.exists` so nothing loads twice); `MiniGameSelectScene.preload()` loads the select-screen's own bits (tile art that isn't a main-game asset + the `playInvite` invite and every tile's `chosenGroup` line). Character sprites and item images (ball, car, toys) are main-game assets already in memory, so mini-games reuse them for free. Each preload registers a `loaderror` handler that just logs — a missing (unrecorded) file no-ops and the code falls back (synth SFX / timers / a spoken fallback line).

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

**CarScene (Little Driver)** — a pretend-driving toy: first-person view from the driver's seat with a windscreen on top and a dashboard + steering wheel below. No fail states, no scoring. Key points:
- **Landscape only.** On entry it flips the game to **1280 × 720** (`this.scale.setGameSize`) and tries `screen.orientation.lock('landscape')`; on exit (`teardown`, wired to `shutdown`) it restores 720 × 1280 and unlocks. A **rotate-your-phone** overlay covers the scene while the device is held portrait (iOS Safari can't lock, so this is the fallback). Layout is derived from the landscape `W`/`H`.
- **Art:** `car_dashboard` (full-bleed frame with a **transparent windscreen hole** the road shows through) and `car_steering_wheel` (rotates), both WebP. The scenery behind the windscreen (sky / hills / grass / perspective road with dashes + roadside bushes) is **code-drawn** placeholder art. Every control still has a **drawn fallback** if the image is missing.
- **Steering:** drag the wheel to rotate (±`WHEEL_MAX_DEG`, clamped), spring-back-to-centre on release (`Back.easeOut`); the scenery layers shift a few px (parallax) with the wheel angle. A non-rotating circular hit-zone under the wheel handles the drag; the horn sits on top and grabs centre taps.
- **Horn:** big button nested in the wheel hub, rotates with the wheel, `playHorn()` (recorded `horn.mp3` if present, else a synthesized two-tone beep), scale-pulse feedback. Snappy on rapid presses (stops the prior sound).
- **Wipers:** code-drawn blades, tap the wiper button → 3 sweeps then stop; `playSwish()` per sweep (audio or synth). **Indicators:** left/right buttons glow + tick (`playTick()`), auto-off after `INDICATOR_TIMEOUT_MS`, tapping the same side or the opposite side cancels.
- **Audio is fire-and-forget and never locks input** (like Tidy) — everything is interactive at once. Missing clips fall back to Web-Audio synth (`_tone`).
- **Exit:** its own **tap-to-open menu** (Main Game / Mini-Game Select / Character Select), not the shared hold-to-exit. There is **no automatic ending yet** (unlike Catch/Tidy) — a deferred TODO noted in `car-game-plan.md`.

**Mini-game audio — partially recorded.** Present: Tidy's `tidy_chosen_1/2/3`, `item_name_*`, `in_it_goes_1/2`, `next_one_1`, `well_done_1`, and Catch's `boing_1/2`. Still missing (run on synth/timers/fallbacks): all Catch voice (`play_invite/play_catch/catch_excite/player_catch/play_tired`); Tidy's `tidy_opening_*` (superseded by `tidy_chosen_2/3`), `tidy_oops_*`, `all_tidy_*`, `in_it_goes_3`, `plop`, `celebrate`; and all Car audio (`horn`, `wiper_swish`, `indicator_tick`, `engine_hum`, `drive_chosen_*`). Each scene's `preload()` attempts its own keys (a `loaderror` is logged + ignored) and the code no-ops / falls back on any missing clip. When recording more: drop files in `assets/audio/`, and (for offline pre-cache) add paths to `sw.js` + bump `CACHE_NAME`.

## Asset reference

**38 images** in `assets/images/`. Background, all character images and the two car-mini-game images are WebP; items + toy box are PNG except `item_apple`. BootScene loads the main-game images (characters as WebP by key convention; a small WebP set — `bg_room`, `item_apple` — for the rest); the car images are loaded on demand by CarScene, and `toy_box_*` by TidyScene / the select screen.

WebP (22):
- `bg_room.webp`
- Each character × 6 emotions: `dolly_*`, `giraffe_*`, `bunny_*` where `* = neutral, needy, happy, sleepy, sleeping, jumping` (18 files)
- `item_apple.webp`
- **Little Driver:** `car_dashboard.webp` (dashboard frame with a transparent windscreen hole), `car_steering_wheel.webp` (rotating wheel). Loaded by CarScene only. *(Converted from the original PNGs — ~4 MB PNG → ~0.4 MB WebP.)*

PNG (16 — items + toy box):
- `item_yogurt.png`, `item_banana.png`, `item_sandwich.png`, `item_biscuit.png`
- `item_water.png`, `item_milk.png`, `item_juice.png`
- `item_blanket.png`, `item_pillow.png`
- `item_teddy.png`
- `item_book.png`, `item_ball.png`, `item_blocks.png`, `item_car.png`
- `toy_box_closed.png`, `toy_box_open.png` (Tidy mini-game; also the Tidy select tile)

The Tidy celebration stars are **generated in code** (no image asset). The Tidy toy-name text uses the self-hosted font `assets/fonts/quicksand-700.woff2`. The Little Driver **scenery** (sky, hills, grass, perspective road + roadside bushes) is also **code-drawn** for now — dedicated `car_sky/hills/roadside/road` art is optional polish (see `car-game-plan.md`).

**52 audio files** in `assets/audio/`:

Requests (15): `request_yogurt.mp3`, `request_banana.mp3`, `request_apple.mp3`, `request_sandwich.mp3`, `request_biscuit.mp3`, `request_water.mp3`, `request_milk.mp3`, `request_juice.mp3`, `request_blanket.mp3`, `request_pillow.mp3`, `request_teddy.mp3`, `request_book.mp3`, `request_ball.mp3`, `request_blocks.mp3`, `request_car.mp3`

Thank-yous (12): `thank_you_1–3,5.mp3` (general), `thank_you_food_1–4.mp3`, `thank_you_comfy_1–3.mp3`, `thank_you_toys_1.mp3`

Wrong answers (4): `wrong_1–4.mp3`

Sleep preambles (3): `sleepy_1–3.mp3`

Misc (4): `all_done.mp3`, `chosen.mp3`, `chosen_2.mp3`, `chosen_3.mp3`

Catch mini-game (2): `boing_1.mp3`, `boing_2.mp3` (wall-bounce SFX)

Tidy mini-game (12): `tidy_chosen_1–3.mp3`, `item_name_ball/book/blocks/car/teddy.mp3`, `in_it_goes_1.mp3`, `in_it_goes_2.mp3`, `next_one_1.mp3`, `well_done_1.mp3`

Little Driver mini-game (0 recorded): `horn`, `wiper_swish`, `indicator_tick`, `engine_hum`, `drive_chosen_1/2` are all **still to record** — the scene runs on synthesized tones until they exist.

All audio is UK English (biscuit, juice, etc.). For the full list of what each clip says (transcribed from the audio) and what's still to record, see `planning_docs/assets-list.md`.

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
