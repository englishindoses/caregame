## 2026-10-14 - Home activity hub and parent settings

Home now offers Care and the four full games directly, with separate saved plushie selection. The old All Games screen redirects to Home. Shared doors offer Home and Care; care breaks retain their short games. Both selection grids use the same game order and generous picture-plus-label tap targets.

A two-second hold on Home's gear opens parent settings: overall volume, Dolly request sound, and other sounds. Request sound controls care requests for all plushies independently of thanks and other audio. Preferences persist across games/reloads, including browser voice and synth effects, while master mute remains a separate quick control. Cache updated to tcm-v15.

## 2026-10-14 - Selection screen spacing and artwork

Both game menus use the name Tidy Time and show Memory as two sage-and-cream heart card backs. The four-tile grids reserve space for labels, header controls, animated press feedback and the plushie below the grid. Phone and laptop layout checks include animation bounds.

## 2026-10-14 - Full Catch, Tidy and Drive

All Games now offers all four existing games in a two-column picture grid. Full Catch has no catch limit; full Drive has no time limit; full Tidy celebrates each batch and starts another with the selected plushie. Default mini modes keep their original care-game returns. All Games loads its Tidy tile directly, image proportions are preserved, and the games' existing media is precached in `tcm-v14`. Further imports are paused.

# Changelog

History of decisions and plan changes. Short entries: what changed and why.

## 2026-10-14 - Mute on every screen and three-set Memory breaks

Added one shared speaker/mute button to every scene, including Home and loading, using the saved `tcm_mute` preference. It silences existing recorded sounds and browser speech immediately while preserving callbacks needed to continue play. Synth effects now connect through Phaser's master mute output. Mute taps do not dismiss Tidy's name reveal.

Memory mini mode now completes three sets at fixed level 3 before its sleepy ending and return to care. It never changes saved full-game progression. The existing Tidy menu tile is confirmed to use `toy_box_closed.png`; that image and the new mute helper are included in the `tcm-v13` precache.

---

## 2026-10-14 - Clearer All Games button

Replaced Home's small Memory-card symbol with a generated transparent illustration of a ball, a chunky puzzle piece and building blocks, matching the existing Plushie Friends artwork. Saved close to its display size as `all_games_icon.webp` (256 x 213). Enlarged the button and picture, added rounded sage-and-cream styling, a raised base, an arrow and gentle press feedback. The full button remains tappable.

The new image loads in SelectScene and is precached for offline use; service-worker version is `tcm-v12`. Phone/laptop checks cover picture readability and tapping the picture, label and arrow. Prompt details are in `all-games-button.md`.

---

## 2026-10-14 - Memory mini fixed at level 3 and praise variety

Memory mini mode now always uses level 3: four cards face down, with no opening preview, regardless of the full game's saved level. It still plays one set and never changes full-game progression. Full Memory's ladder is unchanged.

Memory match and set praise now alternate the existing `well_done_1` ("Well done!") and `thank_you_5` ("You're the best!") recordings. Both lines are used in each completed mini set.

---

## 2026-10-14 - Memory/Pairs, All Games and shared navigation

Added `MemoryScene` with the source project's guided introduction, memory ladder, preview, peek hints, matching celebration and collected-pairs strip, adapted to portrait and the existing Plushie Friends assets. Full mode continues across sets and saves its level. Mini mode starts at the full game's saved level, plays exactly one set and returns to care without changing progression.

Added Home's All Games button and `AllGamesScene` (Memory only). Boot now opens Home as planned. Every non-Home screen uses the shared two-second hold door and destination menu; saved character choice is retained. Extracted the care game's character switcher for other plushie scenes. New audio uses British browser voices as placeholders for complete lines, with recorded existing names/praise used where available and callbacks guarded against missing voice/scene exits.

The care game's existing two-tray break, deck, requests, rewards and hints were preserved. Drive remains portrait with its existing controls and 60-second automatic ending. The preschooler-game source folder was not modified.

Generated a 720 x 1280 warm play-mat background using the bedroom as a style reference (`assets/images/bg_memory.webp`; prompt in `memory-background.md`). Menus reuse existing art; Memory tile and card backs are drawn in code. Added all new runtime scripts/background/shared recordings to the service-worker precache and bumped it to `tcm-v11`.

Validation: syntax checks, eight progression/speech tests, and Chromium checks at phone and laptop sizes. Browser checks cover guided matching, previews, mismatch flip-back, automatic peek, mini modes at all four levels, shared doors across seven screens, character switching, the care game's two-tray break and local offline additions. Real-phone touch and browser voice quality still need user testing.

---


## 2026-07-04 — Little Driver (car) mini-game + per-scene asset loading

**Little Driver — third mini-game (`CarScene`)**
A no-fail pretend-driving toy: first-person driver's view, windscreen on top, dashboard + steering wheel below. Launched from a new `car` tile on the select screen (reuses the existing `item_car` art).
- **Landscape-only scene:** flips the game to 1280 × 720 on entry (`this.scale.setGameSize`), tries `screen.orientation.lock('landscape')`, and restores portrait + unlocks on exit. A rotate-your-phone overlay covers it while held portrait (the iOS-Safari fallback).
- **Controls:** drag-to-steer wheel (±120°, clamped, spring-back-to-centre) with subtle scenery parallax; a big **horn** nested in the wheel hub; **wipers** (code-drawn blades, 3-sweep); **left/right indicators** (glow + tick, auto-off after 6s). Audio is fire-and-forget and never locks input; missing clips fall back to **Web-Audio synth** tones (nothing recorded yet: `horn`, `wiper_swish`, `indicator_tick`, `engine_hum`, `drive_chosen_*`).
- **Exit menu:** the top-right door **taps to open a menu** — Main Game / Mini-Game Select / Character Select — instead of the shared hold-to-exit, since the car has more return destinations. **Automatic ending is a deferred TODO** (unlike Catch's tire-out / Tidy's last-toy) — noted in `car-game-plan.md`.
- **Art:** user-supplied `car_dashboard` (frame with a transparent windscreen hole the road shows through) and `car_steering_wheel` (renamed from the plan's `car_wheel`). Everything else — sky/hills/grass/road scenery — stays **code-drawn** placeholder for now, and every control keeps a drawn fallback if its image is absent.

**Car images converted PNG → WebP**
The supplied PNGs were ~2.4 MB + ~1.6 MB. Converted to WebP (~280 KB + ~134 KB, ~90% smaller, identical quality + transparency), matching the project's convention. The scene loads the `.webp`; the originals `car_dashboard.png` / `car_steering_wheel.png` can be deleted.

**Assets now load per-scene, not all at boot**
BootScene previously loaded *every* asset (main game + all mini-games). Split it: **BootScene loads only the main-game assets**; each mini-game scene's `preload()` loads its own art + audio on demand, and `MiniGameSelectScene.preload()` loads the select-screen's tile art + "let's play" lines. Loads are guarded (`!cache/textures.exists`) so nothing loads twice; character/item art is shared from boot. Boot is leaner and each mini-game only pays for what the child opens. Payloads are small enough that the mini-game scenes need no loading screen. Verified in-browser (Playwright): mini-game assets are absent after boot and appear only once each screen/game is opened.

**Wiring**
Added `scenes/CarScene.js`, `data/car-config.js` (`CAR_CONFIG` tunables); registered CarScene in `main.js` + `index.html`; `MINIGAMES` gained the `car` tile (+ an `imageSrc` field for non-boot tile art) and `PHRASES` gained `driveChosen`.

---

## 2026-07-03 — Assets doc tidy-up

**Consolidated asset reference renamed**
Verified the asset list against what's actually on disk (52 audio, 36 images, 1 font — all match) and confirmed it already reconciles the two design-time sub-docs (`mini-game-assets.md`, `tidy-game-assets.md`), which are now stale and superseded. No content corrections were needed. Renamed `assets-to-create.md` → `assets-list.md` (it now documents what exists, not just what's outstanding) and updated the references in `CLAUDE.md` and `game-plan.md`. The two superseded sub-docs are being removed.

---

## 2026-06-29 — Tidy Time mini-game, exit button, font, PWA caching

**Tidy Time — second mini-game (`TidyScene`)**
Drag all 5 toys into the toy box. Second tile on the select screen (with a `tileScale` so the box tile draws bigger). Built up over many iterations from testing on the real bedroom background:
- Toys use **per-scene gravity**: they rain in and each settles at its own random height across a rug band (top = the character's feet, computed from the sprite; bottom `RUG_BOTTOM`) so they scatter rather than line up. **Live perspective** sizes a toy by its current Y (lower = bigger). A toy dropped on the rug **rests where it's left**; only one released above the rug falls — fixing an earlier unphysical "snaps back up" bug.
- **Real toy-box art** (`toy_box_closed/open`): slides in closed, opens after landing, closes on the last toy.
- **Tap-to-continue name reveal:** each valid drop shows the toy name ~3× big, centred, hovering (Quicksand, auto-fit width) while the toy stays visible; a screen tap pops both and continues. `in_it_goes_1` plays before the name and `in_it_goes_2` (wobbles a remaining toy) after it — each on only 2–3 of the four non-final drops. Final toy: name → tap → box closes + **code-generated star explosion** + celebration sound → "all done" → back to the main game.
- Audio here is **interrupt-based and never locks input** (unlike the main game), so a briskly-tidying toddler never waits.
- Character matches the Catch mini-game exactly (same position/size, stationary).

**Exit door button in the mini-games**
Extracted the main game's hold-to-exit door into a shared `scenes/doorButton.js` (`addDoorButton(scene)`) and added it to Catch, Tidy, and the select screen. Same behaviour: hold 2s → clear saved character → SelectScene.

**Self-hosted Quicksand font**
Toy names use Quicksand (OFL, single-story "a"), self-hosted at `assets/fonts/quicksand-700.woff2` so the PWA stays offline-capable. Declared via `@font-face` and awaited in BootScene before scenes render (Phaser draws text to canvas, so the font must load first).

**Service worker → network-first for code**
Root cause of "reload shows no changes": the cache-first worker served stale JS forever, and code-only commits didn't bump `CACHE_NAME`. Switched HTML/JS to **network-first** (cache fallback for offline) and kept images/audio/fonts **cache-first**. Now online reloads always get the latest code. `CACHE_NAME` walked `tcm-v3 → tcm-v7` over this work.

**Catch ending voiced**
`play_tired_*` aren't recorded, so the sleepy ending was silent; it now falls back to the real `sleepy_*` lines.

**Synthesized SFX while assets are pending**
`boing` (now `boing_1/2` recorded), `plop`, and `celebrate` are synthesized via the Web Audio API so the mini-games are audible before those files exist.

**Asset filename reconciliations**
Toy-name lines are `item_name_*` (generic/reusable), not `tidy_name_*`. The Tidy in-scene opening reuses `tidy_chosen_2/3` (cycled), so `tidy_opening_*` is no longer needed.

---

## 2026-06-27 — Catch mini-game (first mini-game; audio pending)

**New "break" loop after 3 trays**
PlayScene now counts cleared trays (`traysCleared`); after 3 it starts `MiniGameSelectScene` instead of dealing the next tray, then resumes via `{ fromMinigame: true }` (skips the chosen-audio intro). Breaks up the routine so the game isn't an endless request loop.

**MiniGameSelectScene — "What shall we play?"**
A select screen built to scale: each `MINIGAMES` entry is a tappable tile, layout adapts for 1–4 tiles (only Catch wired up). The ball tile uses the ball image's full bounding box as the hit area so a child can tap anywhere on it (the first attempt used a Container with a custom rectangle hit area, which mis-aligned so only part of the ball responded — switched to a plain interactive image). Removed the white backing box so the ball sits transparently on the room background, per testing feedback.

**CatchScene — throw-and-catch, no failure states**
Arcade Physics with **no gravity** (top-down feel) so throws stay forgiving for a 3-year-old. Throw is **drag-and-release** (the ball follows the finger, release direction + speed become the throw); sideways flicks bounce off the walls. Character catches when the moving ball passes within ~150px, jumps, thanks the child, holds ~800ms, then throws the ball back down to the rug. After 5 catches the character tires (sleepy) and returns to the main game.

**"Option B" — ball settles on the rug instead of floating**
First version left a resting ball frozen wherever it stopped (floating in mid-air against the bedroom background). Considered real gravity but it makes catching too hard for a toddler. Chose Option B: the physics world is bounded at the rug line (`FLOOR_Y`) so the ball can't sink below it, and a throw that runs out of energy does a quick accelerating drop onto the floor (`settleToFloor`). Keeps throws forgiving while looking like the ball lands. Character also nudged down so it doesn't float above the floor.

**Synthesized "boing"**
The wall-bounce SFX is generated in code (Web Audio oscillator with a fast pitch drop + fade) so the bounce is audible immediately without recording a file. Falls back to `boing.mp3` automatically once that file exists. Respects mute.

**Audio deferred**
The 14 mini-game voice clips and `boing.mp3` aren't recorded yet. BootScene tries to load them (errors logged + ignored), the audio queue no-ops on missing keys, and every beat is backed by a timer — so the whole mini-game plays on timers until the clips are added. The character-catch line reuses the existing `thank_you_toys_1` for now. Phrase arrays added to `PHRASES`: `playInvite, playCatch, catchExcite, playerCatch, playTired`.

**Wiring**
Arcade Physics enabled in `main.js`; `MiniGameSelectScene` + `CatchScene` registered and scripted into `index.html`; `data/minigames.js` added. `?mini` URL flag in BootScene jumps straight to the mini-game for testing (to be removed before release). `sw.js` bumped `tcm-v2 → tcm-v3` with the new code files cached — mini-game audio paths intentionally left out until the files exist, since `cache.addAll` rejects the whole install on any 404.

---

## During development (build phases 1–8)

**Tray size: 5 → 3 items**
Planned 5 items in the tray; switched to 3. Three items fills the tray without crowding on small phone screens and keeps choices simple enough for a 3-year-old.

**Character emotion on request: always needy → 60% neutral / 40% needy**
Always showing the needy face felt a bit sad and repetitive. Added a 40% chance of needy so the character sometimes looks fine and sometimes looks a little helpless — more natural.

**`chosen` audio: single file → 3 variants cycling in order**
One "Yay! Let's play!" got repetitive fast. Added `chosen_2` and `chosen_3` and a `nextChosen()` method on PHRASES that cycles through them in order rather than randomly (avoids accidentally repeating).

**`phrases.js` gained `request` field on items**
The original items.js had no `request` field — the request text was assembled from the item name. Added a dedicated `request` field (e.g. "some yogurt", "my teddy") so each item controls its own phrasing rather than generating it from the name.

**Scale mode: `Scale.EXPAND` → `Scale.FIT`**
`EXPAND` stretches the canvas to fill the screen, which distorts layout on non-standard ratios. `FIT` scales uniformly and letterboxes — correct behaviour for a fixed-layout portrait game.

---

## 2026-06-26 — Toys at the feet, all-done face, teddy is a toy

**Toys settle at the character's feet**
When a play item is given it now glides down to a fixed spot at the character's feet, shrinks to ~80%, and stays there (non-draggable) until the tray resets — instead of freezing wherever it was dropped. Multiple toys in one tray line up around the centre.

**"All done" shows a neutral face**
The character resets to a neutral face just before the "All done, let's play again!" line, so the last item's reward face (e.g. a sleeping face from a blanket) no longer carries over into it.

**Teddy reclassified comfort → play**
Teddy is a toy, so it now lives in the `play` category: it settles at the feet and stays, uses the toy thank-yous, and gets the jumping animation. The `comfort` category now has no items; its code paths (the comfort thank-you branch and `CATEGORY_COLORS.comfort`) are kept as a defensive no-op for any comfort item added later. The `thankYouComfy` audio is still used by the `sleep` category, so it isn't orphaned.

---

## 2026-06-25 — Reward-flow consistency fixes

**All three characters now have the full emotion set**
Previously only Dolly's `sleepy`/`sleeping`/`jumping` images were loaded; Giraffe and Bunny silently fell back to their previous face whenever one of those was requested. Added the missing artwork (every character now has `neutral/needy/happy/sleepy/sleeping/jumping`, all WebP) and changed BootScene to load all six emotions for every character in a single loop instead of hard-coding Dolly's three extras. The old PNG character originals were removed — characters are WebP-only now (34 images total: 20 WebP + 14 PNG items).

**Reward face is category-dependent and now works for every character**
On a correct answer: food/drink and comfort → `happy` + bounce; play → 70% `jumping` / 30% `happy` + bounce; sleep → `sleeping` with the idle bob stopped so the character rests still (no bounce; idle resumes on the next request). Before this fix these special faces only worked for Dolly — Giraffe/Bunny would keep a needy face or bounce with the wrong expression.

**Sleep thank-you is soft-only**
A sleeping character no longer plays the excited general "yay!" thank-yous; sleep uses the `thankYouComfy` lines alone. Comfort items still combine comfy + general.

**Toys stay in the tray until it resets**
Play-category items used to vanish 1s after being given (like food being eaten). They now remain in their slot (non-draggable) until the tray reloads — reads better for a toy.

**Request text clears the moment the right item is given**
Previously the item name lingered on screen through the thank-you audio until the next request overwrote it.

**`sleepy_3.mp3` wired in**
Added to `PHRASES.sleepy`, so it now loads and plays as a third sleep-preamble variant.

**Per-character `emotions` list as single source of truth**
Each character in `characters.js` now declares an `emotions` array of the faces it has artwork for. BootScene loads images from that list instead of a hard-coded set, and `setCharEmotion` falls back to the happy face if asked for an emotion a character doesn't have. Previously a missing emotion image silently left the wrong expression on screen (the root cause of the Giraffe/Bunny sleep/jump bug). Hardening only — all three characters currently have the full six-emotion set.

**Doc correction — wrong-answer audio timing**
Clarified the actual behaviour everywhere: the **first** wrong attempt plays a random `wrong` clip, the **second** replays the request audio, and the third triggers the visual hint. The wrong clips were added after the original silent-first-try design, but CLAUDE.md / game-plan still described the first try as silent and the "Sleep category and audio expansion" note below said the clip played on the second attempt — both were inaccurate and have been corrected.

---

## 2026-06-25 — PWA support

**Installable as a standalone app (Android + iOS)**
Added `manifest.json` (name, portrait orientation, cream theme colour) and `sw.js` service worker. On first load the SW pre-caches all 28 images, 37 audio files, all scripts, and the Phaser CDN bundle. Subsequent loads — including fully offline — serve everything from cache. To push an update: bump `CACHE_NAME` in `sw.js`; the browser will re-cache silently in the background and apply on next relaunch.

**Icon placeholder**
Currently uses `dolly_happy.png`. Needs replacing with a proper 512×512 square PNG (character on `#F2E4D4` background).

---

## 2026-06-25 — Asset optimisation

**WebP conversion**
High-traffic images converted to WebP (bg_room, dolly_neutral/needy, all bunny variants, item_apple). BootScene selects `.webp` or `.png` per asset via a `webp` Set. Remaining assets stay as PNG until converted.

**Character image resizing and compression**
All character PNGs resized and compressed to reduce payload. `dolly_play.png` renamed to `dolly_jumping.png` to reflect actual use (the jumping/celebrate face).

**Removed mislabelled thank_you_4.mp3**
File was labelled incorrectly; removed from repo. `PHRASES.thankYou` updated to use `thank_you_5` in its place.

---

## 2026-06-25 — Sleep category and audio expansion

**Dolly expression variants for sleep items**
Added `dolly_sleepy.png` (drowsy, half-closed eyes), `dolly_sleeping.png` (eyes closed), and `dolly_jumping.png` (celebrate face). Sleep item requests now show the sleepy face with a preamble audio clip before the request plays.

**Category-specific thank-you audio**
`PHRASES` gained `thankYouFood`, `thankYouComfy`, and `thankYouToys` arrays. PlayScene picks the appropriate array based on the item's `category` field instead of always playing a generic thank-you.

**Wrong-answer audio**
Added `wrong_1–4.mp3`, played on the first wrong attempt (the second attempt replays the request audio, the third shows the visual hint). Before these clips existed the first try was silent. *(Corrected 2026-06-25 — an earlier version of this note said "second attempt", which was wrong.)*

**Sleep preamble audio**
Added `sleepy_1–2.mp3`. Played before the request audio for sleep category items (blanket, pillow) to set the mood.

---

## 2026-06-23 — Gameplay and audio improvements

**Character switcher added to PlayScene**
Two small thumbnails of the non-active characters now appear in the top-left corner, stacked vertically. Children can tap them to switch character mid-game without needing the parent menu. The switcher rebuilds itself whenever the active character changes.

**Request text: full sentence → item name only**
The request text changed from "Can I have a banana, please?" to just "Banana". Kids can't read full sentences but can start to recognise individual words. Font increased to 72px, colour changed to white with a black outline for readability over the background.

**Two-tier audio system to fix queue pile-up**
Request audio (initial and wrong-answer replay) now uses `interruptAudio()` — stops whatever is playing, clears the queue, and plays immediately. Thank-you and all-done audio use `queueAudio()` / `queueThen()` as before. This prevents stale request audio from bleeding into the next round when a child answers quickly or makes repeated wrong attempts.

**Tray-end pause sequence**
When all tray items are given: character stays happy while all-done audio plays to completion, then switches to neutral, brief 400ms pause, then the next tray loads. Previously the tray loaded on a fixed 1400ms timer regardless of audio length.

**Character intro sequence**
When arriving from SelectScene, the tray no longer loads immediately. The character is shown on a neutral face with no items while the chosen audio plays; the tray loads only after the audio finishes.

---

## 2026-06-23 — Repo restructure

**Moved repo root from `game-creation/` to `game/`**
Original repo was at the `game-creation/` level with `game/` as a subfolder. This meant `index.html` was not at the repo root, which caused a GitHub deployment issue. Deleted the original repo, created a new one inside `game/` so `index.html` is at root.

**Moved planning docs into `game/planning_docs/`**
Planning files (CLAUDE.md, game-plan.md, etc.) were at the `game-creation/` level. After the repo restructure they were moved inside `game/planning_docs/` to keep everything in one place.

**Moved `CLAUDE.md` to repo root**
After the planning docs move it was in `planning_docs/CLAUDE.md`, which Claude Code doesn't auto-load. Moved to `game/CLAUDE.md` (the repo root) so it's picked up automatically in every session.

**Refactored chosen audio loading in BootScene**
Was iterating `CHARACTERS` and looking up `PHRASES.chosen[char.id]` (treating chosen as a map). Changed to iterate `PHRASES.chosen` directly as an array, matching the actual data structure.
