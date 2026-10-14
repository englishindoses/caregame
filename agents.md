# Project guidance for Codex

## Scope and existing instructions

- Read `CLAUDE.md` and the parent `../CLAUDE.md` before working here. The parent contains shared asset, British English, offline and responsive-layout guidelines; project-specific instructions take precedence where they differ.
- Preserve existing user changes. At initial inspection, `CLAUDE.md` was modified and `.claude/` and `merge-plan.md` were untracked. Do not overwrite, revert, commit or publish those changes without an appropriate user request.
- The user has authorised the first merge: Memory/Pairs, All Games and shared navigation. Preserve the care game's existing rules and two-tray break. Later game imports remain out of scope. The sibling `preschooler-game` folder is read-only. Ask about unresolved product decisions.
- `.claude/settings.local.json` contains Claude Code tool permissions, not authorisation for Codex to commit, push, install packages or modify other projects.
- Planning documents describe intent and history. Check executable code for current behaviour, and distinguish an unimplemented plan from an active feature.

## Purpose and stack

My Plushie Friends (previously called Take Care of Me) is a touch vocabulary game for roughly three-year-olds. Children choose Dolly, Giraffe or Bunny, give requested items to their plushie, and take breaks with mini-games. Keep interactions generous, forgiving and calm.

- Static HTML and vanilla JavaScript; Phaser 3.60.0 currently loads from jsDelivr.
- No package manifest, bundler or module imports. Plain script tags define global constants, scene classes and helpers; their order matters. The merge adds dependency-free Node tests and optional Python Playwright browser checks under `tests/`.
- Reference canvas: 720 x 1280 portrait, `Phaser.Scale.FIT`, centred. All current scenes, including CarScene, use portrait.
- Arcade Physics has zero gravity by default. Catch uses no gravity; Tidy sets gravity in its own scene.
- Assets are WebP/PNG images, MP3 audio and a self-hosted Quicksand 700 font. Boot waits for the font before routing because Phaser renders text on canvas.

## Structure

| File or directory | Responsibility |
| --- | --- |
| `index.html` | Page styles, font declaration, Phaser dependency, ordered scripts, service-worker registration |
| `main.js` | Phaser configuration, physics and registered scenes |
| `data/items.js` | 15 item definitions: id, name, request, image, audio, category |
| `data/characters.js` | Three characters, image keys and six supported emotions each |
| `data/phrases.js` | Shared phrase keys, chosen-line cycling, Tidy opening shuffle bag |
| `data/minigames.js` | Catch, Tidy and Drive tiles and their destination scenes |
| `data/car-config.js` | Steering, wiper, indicator, parallax, dashboard and automatic-ending settings |
| `scenes/BootScene.js` | Main-game loading, progress bar, font wait and initial routing |
| `scenes/SelectScene.js` | Character picker |
| `scenes/PlayScene.js` | Care loop, shuffled deck, tray, requests, rewards, hints, audio queue; shared switcher and door |
| `scenes/MiniGameSelectScene.js` | Responsive tile grid and tile/invitation asset loading |
| `scenes/CatchScene.js` | Ball throwing, settling, catching and automatic ending |
| `scenes/TidyScene.js` | Falling toys, drag/drop, name reveal, toy box and celebration |
| `scenes/CarScene.js` | Pretend driving, scenery, wheel, horn, stalks, wipers, indicators and exit menu |
| `scenes/doorButton.js` | Shared two-second hold to open destination menu, retaining character |
| `data/memory.js`, `data/allgames.js` | Memory ladder/progression rules and full-game menu entries |
| `scenes/MemoryScene.js`, `scenes/AllGamesScene.js` | Memory mini/full modes and full-game selection |
| `scenes/speech.js`, `scenes/muteButton.js`, `scenes/characterSwitcher.js`, `scenes/memoryArt.js` | Scene-owned voice, shared mute control, corner plushie switcher, existing-art Memory tile |
| `manifest.json`, `sw.js` | PWA metadata and offline caching |
| `assets/` | Runtime media plus some source/reference images |
| `planning_docs/` | Design plans, asset reference, changelog and office documents |
| `merge-plan.md` | Implemented first merge and later game-import plans |

## Care-game behaviour (preserved by the merge)

Boot loads main-game images and voice clips and normally opens Home (`SelectScene`), even with a saved character. Home retains the three plushies and adds All Games. Its large rounded button uses the generated transparent `all_games_icon.webp` (ball, puzzle piece and blocks), loaded by SelectScene and precached. `?mini` opens the mini-game menu; `?memory` opens full Memory. Mini-game assets load on demand, guarded against duplicate loads.

PlayScene deals three items from a shuffled deck. A request selects one remaining item. Correct drops clear the request immediately, play category-specific thanks and advance after audio. Food/drink disappear; play items settle at the plushie's feet; sleep items produce a still sleeping face and soft thanks. Teddy is a play item; no item currently uses the defensive comfort category. Sleep requests sometimes get a sleepy preamble. Wrong attempts give spoken feedback, then replay the request, then show a visual hint that permits an easy tap/drag success.

After **two** cleared trays, PlayScene opens MiniGameSelectScene. Mini-game returns start a fresh PlayScene and deck; they do not preserve the previous tray/deck. `fromSelect` controls the introductory chosen line; callers pass `fromMinigame`, but PlayScene does not explicitly read that flag.

- Catch uses a phase state machine, drag-release velocity, forgiving catch radius and a tween to settle stalled balls on the rug. After five completed returns to the child, the next character catch ends the game with a tired/sleepy line and returns to care.
- Tidy has five toys, per-scene gravity and position-dependent scale. A successful drop shows the toy name until a screen tap; other toys are locked during that reveal. Voice interrupts and does not itself lock input. The last reveal leads to stars, an ending line and care.
- Drive stays portrait. The wheel steers and springs back; left stalk runs wipers, right stalk selects indicators (up = left, down = right). Audio never locks controls. Missing SFX use Web Audio synthesis. `AUTO_END_MS` is currently 60000. Its door now uses the shared hold navigation menu.
- Every non-Home screen uses the shared two-second hold door: Care Game / Games Menu / Home, omitting the current screen. Outside taps dismiss it. Timers and physics pause while open. The saved character is retained.
- Saved keys: `tcm_character`, `tcm_mute`, `tcm_memory_level`. Every screen, including Home and loading, has the shared speaker/mute control. Mute immediately silences recorded voice, browser speech and synth effects, persists between screens/reloads, and does not discard speech continuations.

## Memory merge

- Full Memory preserves the source ladder: guided boards 4, 4, 6, 6; level 2 four cards with preview; level 3 four cards without preview; level 4 six cards with preview. Five sets promote; four mismatches step down, never below level 2. Four flips without a match trigger a peek.
- **Mini mode never writes or advances progression.** It always uses level 3 (four cards, initially face down, no opening preview), plays three sets, celebrates, becomes sleepy and returns to care. The saved full-game level has no effect on mini mode.
- Only `tcm_memory_level` persists. Guided-board/set counters reset on re-entry, matching the source implementation.
- Existing item/plushie images and recorded toy names, praise and sleepy lines are reused. Memory praise starts with `thank_you_5` (You're the best!) and alternates with `well_done_1` (Well done!). New whole lines use en-GB browser voice; never splice recorded and synthetic audio within one sentence. Missing/blocked speech must still complete callbacks. Stop scene-owned playback and discard stale callbacks on exit.
- `bg_memory.webp` is generated in the existing style; prompt and asset details are in `planning_docs/memory-background.md`. All Games reuses `bg_room`. Memory menu art/card backs are code-drawn.
- Later imports (Listen & Tap, Odd One Out, Patterns) are not implemented and require their own scope.

## Conventions for future changes

- Keep British English throughout interface copy, vocabulary and recorded/spoken audio: for example colour, recognise, biscuit, maths and aeroplane.
- Derive layout from current canvas dimensions and check phone and laptop sizes. Prioritise phone portrait and large touch targets; real-device testing is needed for touch feel.
- Follow the inherited preference to size images close to their on-screen dimensions. Preserve transparency and consistent character/asset style.
- Preserve scene-specific audio behaviour: queued voice/input gating in care, Catch and mini-game selection; interrupting voice in Tidy; independent effects in Drive. Account for mobile audio unlock and missing clips.
- Keep main-game loading in Boot and mini-game loading in their respective scenes. Character emotion lists are the loading source of truth; unavailable emotions fall back to happy where supported.
- New scene/data/helper files need correctly ordered script tags, scene registration where applicable and service-worker entries.
- Full offline operation is a standing requirement for every game, regardless of expected connectivity. Inline, vendor or self-host scripts, stylesheets, fonts and images; do not introduce new CDN resources or other external runtime dependencies. Self-host fonts with `@font-face` rather than relying on remote font links and silent system-font fallbacks. Existing Phaser CDN usage is documented in project-specific instructions and differs from the parent's self-hosting rule; retain that distinction for review, and do not silently change it during unrelated work.
- `sw.js` uses network-first HTML/JS and cache-first media. Add existing new assets to `ASSETS` and bump `CACHE_NAME` for media changes. Never pre-cache unrecorded/nonexistent files: one failed `cache.addAll` request rejects installation.
- Clean up scene-owned sound, listeners, repeating timers and tweens as appropriate when making lifecycle changes. Do not undertake a general refactor without scope to do so.

## Running and verification

Serve the repository root over HTTP, for example `python -m http.server 8000`, then open `http://localhost:8000/`. Direct `file://` loading is unsuitable. `?mini` bypasses the care trays for development.

For future JavaScript edits, run `node --check` on changed files if Node is available. Use browser smoke checks appropriate to the feature: initial routing, audio unlock, correct/wrong/hint flow, character switching, mini-game entry/return and doors. Test changed layouts at multiple sizes and touch interactions on a real phone. For offline changes verify actual precache paths, installation and offline reload with browser developer tools. The merge has Chromium integration checks at phone/laptop sizes in `tests/merge-smoke.py`, cache/offline-addition checks in `tests/cache-check.py`, and nine Node progression/speech tests. Browser tests use a test-only exact Phaser 3.60.0 copy under ignored `tests/.cache/`; screenshots are under ignored `tests/artifacts/`. Real-device touch and voice testing remain to be done.

## Documentation differences and deferred work

Initial inspection found the following; they are recorded here, not fixed:

- `CLAUDE.md` and older plans say three trays; code uses two.
- `CLAUDE.md` and the car design describe landscape and no automatic ending; code uses portrait, draggable stalks and a 60-second ending.
- `nextTidyOpening()` uses a shuffle bag, although some documentation describes simple cycling.
- Actual service-worker cache name is `tcm-v13`.
- `manifest.json` and the Apple touch icon reference `assets/images/dolly_happy.png`, which is absent; the character image is WebP.
- The merge precaches shared recorded toy names/praise required by Memory. The closed toy-box menu image is also precached. Other existing Catch/Tidy audio and open toy-box art remain outside explicit precache and cache on demand; no unrelated offline overhaul was requested.
- Several mini-game voice/SFX files are deliberately unrecorded; loader warnings and synth/timer/existing-clip fallbacks are expected.
- Some comments and design documents predate the current implementation. Asset counts and filenames must be checked on disk before relying on them.
- The first Memory/All Games/navigation merge is implemented. The source preschooler project remains read-only; future plans are not automatically authorisation to implement more games.

The initial inspection reviewed the parent and project Claude guidance, Claude local settings, all runtime JavaScript/HTML/PWA files and Markdown planning documents. Office-format planning files remain supplementary references.
