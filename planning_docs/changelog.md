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
Added `wrong_1–4.mp3`. PlayScene plays a random wrong-answer clip on the second wrong attempt (previously just replayed the request audio).

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
