# Changelog

History of decisions and plan changes. Short entries: what changed and why.

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
