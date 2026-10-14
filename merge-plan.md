## Current navigation (2026-10-14)

Home is now the activity hub with direct Care, Memory, Catch, Tidy Time and Drive buttons and a separate plushie selector. The separate All Games screen has been replaced by Home. Doors offer Home and Care; care-break mini games remain short. Hold Home's gear for parent volume and independent request/other sound settings. Earlier navigation diagrams below are historical.

# Merge Plan — Preschooler Games into Plushie Friends

## The goal

Plushie Friends is the game to develop further. It has the look and feel we want. The games in `preschooler-game` are well developed, so we bring them into Plushie Friends **one at a time**. The preschooler game itself is **left as it is**: it is the source we copy from, not something we change or delete.

Each game is **rebuilt** in Plushie Friends' style, not copied file-for-file, because the two projects are built differently:

| | Preschooler game | Plushie Friends |
|---|---|---|
| Code | TypeScript + Vite (build step) | Plain JavaScript, no build step |
| Screen | Landscape 1280 × 720 | Portrait 720 × 1280 |
| Voice | Browser voice (placeholder) | Recorded MP3s |
| Pictures | Farm animals, vehicles, food | The 15 Plushie items |
| Mascot | Ziggy the giraffe (emoji) | Dolly, Giraffe, Bunny |

The game rules and logic carry over almost unchanged. The layout, look, mascot and audio are reworked to fit Plushie Friends.

## Current scope (2026-10-14)

Further imports are paused. All Games offers full Memory, Catch, Tidy and Drive. Catch and Drive continue until the door is used; Tidy celebrates and starts another five-toy batch. Their care-break versions retain the existing endings. The later imports below are historical plans, not active work.

## Order of games

1. **Memory / Pairs** — first, fully planned below.
2. Later, one at a time, and each planned when we get to it: **Listen & Tap**, **Odd One Out**, **Patterns**.

Every merged game gets a **mini-game version** (a short break in the care game) and a **full version** on the All Games menu.

---

## First piece of work: Memory, the All Games menu and the shared door

Three connected pieces of work:

1. **Memory game.** Port Memory / Pairs from `preschooler-game` (`src/scenes/MemoryScene.ts`) into Plushie Friends.
2. **All Games menu.** A new screen where children can play the **full versions** of the games, not only the short mini-game breaks inside the care game.
3. **One shared door.** Every screen gets the same door: **hold it** to open a menu of three places to go.

**Build status:** implemented locally; automated browser checks passed. Real-device playtest pending.

---

## Screens and how they connect

```
                 ┌──────────────────────────┐
  app opens ───► │  HOME (character select) │
                 │  3 plushies + All Games  │
                 └──────┬─────────────┬─────┘
           tap plushie  │             │ tap All Games
                        ▼             ▼
              ┌──────────────┐   ┌──────────────────┐
              │  CARE GAME   │   │  ALL GAMES MENU  │
              │ (PlayScene)  │   │ (AllGamesScene)  │
              └──────┬───────┘   └────────┬─────────┘
       after 2 trays │                    │ tap a game
                     ▼                    ▼
           ┌──────────────────┐   ┌──────────────────┐
           │ MINI-GAME SELECT │   │  FULL GAME       │
           └────────┬─────────┘   │ (e.g. Memory,    │
                    ▼             │  never ends)     │
           ┌──────────────────┐   └──────────────────┘
           │ MINI-GAME        │
           │ (short, then back│
           │  to Care Game)   │
           └──────────────────┘

  Every screen except Home: hold the door → Back to Care Game / Back to Games Menu / Back to Home
```

---

## Implementation clarifications

- Preserve the existing care-game rules and its two-tray break. Startup and shared navigation changes follow this plan.
- Full Memory alone changes saved progression; mini Memory always uses level 3 and plays three sets.
- The sibling preschooler-game folder is read-only.
- Reuse Plushie Friends images/sounds. New lines use whole-line British browser voice placeholders. Generate strictly needed new images in the existing style.

## Decisions (agreed)

### App start
- The app **always opens on the Home screen** (character select). BootScene stops skipping to the care game when a plushie is saved.

### Home screen (character select)
- The three plushies are unchanged.
- An **All Games** button sits at the bottom with a large generated picture of a ball, puzzle piece and blocks (`all_games_icon.webp`), in a rounded sage-and-cream panel.
- Home has **no door**, because it is the top of the app.

### Shared door (all screens)
- **Hold the door for 2 seconds** (the arc draws as now). A menu then opens with three big buttons:
  - **Back to Care Game** → PlayScene with the current plushie
  - **Back to Games Menu** → the All Games menu
  - **Back to Home** → character select
- The option for the screen you are **already on is hidden**. For example, the Games Menu's door shows only Care Game and Home.
- Tapping outside the buttons closes the menu.
- Holding stops a toddler from opening it by accident. The 3-option menu means the adult chooses where to go.
- **This replaces every existing door:**

  | Screen | Today | After |
  |---|---|---|
  | Care game (PlayScene) | own copy: hold → Home | shared door |
  | Mini-game select | hold → Home | shared door |
  | Catch, Tidy | hold → Home | shared door |
  | Drive (CarScene) | **tap** → its own 3-option menu | shared door (hold) |
  | Memory (both modes) | — | shared door |
  | All Games menu | — | shared door |

- The shared menu is based on Drive's existing "Where to?" menu (same panel and button style), moved into `doorButton.js`. It must lay out from the current screen size.
- Leaving through the door no longer clears the saved plushie. The app always opens on Home anyway, so there is nothing to clear.

### Plushie in the games
- Any game that shows a plushie starts with the **last-selected** one, or **Dolly** if none has been chosen yet.
- The other two sit in the **top-left corner as switch options**, like the care game. Switching saves the choice.

### Memory game
- **One scene, two modes.** `MemoryScene` starts with `{ mode: 'mini' }` or `{ mode: 'full' }`.
  - **mini** — from mini-game select. Plays **3 sets**, celebrates, the plushie goes sleepy, then it returns to the care game.
  - **full** — from the All Games menu. **Never ends.** Plays exactly like the preschooler version, with the full level ladder.
- **Full mode alone updates the saved level** (`tcm_memory_level`). Mini mode always uses level 3 (four cards starting face down, no preview); it never contributes to levelling up or changes the saved level.
- **Cards:** the 15 Plushie items (`ITEMS`). Their pictures are already loaded at start-up, so no new art is needed.
- **Card backs:** code-drawn (a soft rounded card in the Plushie palette with a heart or star).
- **Background:** a generated warm play-mat image matching the existing bedroom style (`assets/images/bg_memory.webp`).
- **Voice:** use a recorded clip when the **whole line** already exists. Otherwise use the **browser voice** (en-GB) as a placeholder for the whole line. Recorded and computer voices are never mixed inside one sentence.

### All Games menu
- A grid of big picture tiles, like mini-game select. It holds only **Memory** for now; full versions of other games are added later, one at a time.
- Background: the **playroom** recommendation below. It reuses `bg_room` until that image exists.

---

## Memory game rules (carried over unchanged)

| Level | Mode | Cards | Start |
|---|---|---|---|
| 1 | guided | boards of 4, 4, 6, 6 | Face up. Tap a card and it is named ("Where's the other …?"). Tapping the partner makes a match; a wrong tap does nothing. |
| 2 | memory | 4 | Shown face up for 2 s, then flipped down |
| 3 | memory | 4 | Starts face down |
| 4 | memory | 6 | Shown face up for 2 s, then flipped down. This is the top level. |

- Memory levels: a wrong pair flips back after 0.8 s.
- **Take a peek:** after 4 flips with no match, all unmatched cards show for 1 s.
- **Step down:** 4 or more mismatches in a set → the next set drops a level (never back below level 2).
- **Step up:** clear 5 sets at a level → move up. Level 1 → 2 after its 4 boards.
- **Match:** the pair grows side by side, a star burst plays, then the cards spin away into the collected-pairs strip.
- **Set complete:** big spinning star with bursts. Then the next set (full mode) or the return to the care game (mini mode).
- **No fail states.** Nothing ever says "wrong".

## Memory layout (portrait 720 × 1280, derived from `this.scale.width/height`)

```
┌───────────────────────────┐
│ [sw][sw]   WORD     [door]│  top band: switcher, big word (Quicksand), door, mute
│                           │
│     ┌────┐   ┌────┐       │
│     │card│   │card│       │  card grid: 2 columns
│     └────┘   └────┘       │  4 cards = 2 × 2, 6 cards = 2 × 3
│     ┌────┐   ┌────┐       │  cards ~240 px, sized to fit
│     │card│   │card│       │
│     └────┘   └────┘       │
│                           │
│ (plushie)  [pr][pr][pr]   │  bottom band: plushie + collected pairs strip
└───────────────────────────┘
```

- The plushie bobs gently in the bottom band. Faces: `neutral` while playing, `happy`/`jumping` on a match, `happy` on set complete, and `sleepy` before leaving (mini mode).
- Card picture = the item image at about 84% of the card size. Check the item PNGs are saved close to that display size (shared CLAUDE.md asset rule).
- Check at phone and laptop sizes before calling it done.

## Memory audio

| Moment | Source |
|---|---|
| Item name (on match, guided tap) | `item_name_*` if recorded (ball, blocks, book, car, teddy), else browser voice |
| Praise on match | alternate `well_done_1` (Well done!) and `thank_you_5` (You're the best!) |
| Set complete | same alternating Memory praise recordings |
| "Look!", "Can you find the pairs?", "Where's the other …?", "Take a peek!" | browser voice (to record later) |
| Mini-game tile "let's play memory" | browser voice (to record later) |

- **Offline note:** the browser voice uses the device's built-in voices. Most phones have them offline, but some may stay silent. Recorded clips replace these lines later.

---

## Shared helpers

Code written once and used by several screens:

| Helper | What it does |
|---|---|
| `scenes/doorButton.js` | **Rewritten.** `addDoorButton(scene)`: hold-to-open door → the 3-option "Where to?" menu, with the current screen's option hidden. Used by every screen except Home. |
| `scenes/characterSwitcher.js` | **New.** The two corner thumbnails for switching plushie, taken out of PlayScene so any game can use them. Saves the choice. |
| `scenes/speech.js` | **New.** `speak(text, onEnd)`: the browser-voice placeholder. en-GB, respects the game's mute (`tcm_mute`), and always calls `onEnd` so a game never stalls without a voice. |

- **Saved keys:** `tcm_character` (last plushie, no longer cleared by the door), `tcm_memory_level`, `tcm_mute` (existing).

## Files

```
/scenes
  doorButton.js         ← rewrite: hold → 3-option menu (see Shared helpers)
  characterSwitcher.js  ← new
  speech.js             ← new
  MemoryScene.js        ← new: mini + full modes, MemoryCard class
  AllGamesScene.js      ← new: All Games menu
  SelectScene.js        ← All Games button + placeholder picture
  BootScene.js          ← always go to Home; add a ?memory dev shortcut
  PlayScene.js          ← use shared door + shared switcher (remove its own copies)
  CarScene.js           ← use shared door (remove its own tap menu)
  MiniGameSelectScene.js, CatchScene.js, TidyScene.js ← nothing to change (they already call addDoorButton)
/data
  minigames.js          ← add the memory tile (mode: 'mini')
  allgames.js           ← new: ALL_GAMES list (memory only for now)
  phrases.js            ← memory phrase keys
index.html, main.js     ← register the new scripts and scenes
sw.js                   ← add new files, bump CACHE_NAME
CLAUDE.md, planning_docs/changelog.md ← document the new flow once built
```

## Build phases

1. **Shared helpers + start-up.** `speech.js`, `characterSwitcher.js`, the new door, and BootScene always going to Home. Switch PlayScene and CarScene to the shared door. Check that every existing screen's door still works.
2. **Memory, full mode.** Port the logic, lay it out for portrait, add the plushie mascot and switcher. Test through `?memory`.
3. **Memory, mini mode.** 3 sets → sleepy plushie → care game. Add the tile to `MINIGAMES`.
4. **All Games menu.** `AllGamesScene` + the button on Home.
5. **Wrap-up.** `sw.js`, CLAUDE.md, changelog. Check at more than one screen size.

---

## Assets for the user to make later

| Asset | Size | Notes |
|---|---|---|
| `bg_memory.webp` | 720 x 1280 | Generated and integrated: warm cream play mat, plain centre for cards |
| `bg_games.webp` | 720 × 1280 | All Games menu background (see recommendation below) |
| `all_games_icon.webp` | 256 x 213 | Generated transparent ball, puzzle piece and building blocks; integrated in Home |
| `memory_tile.webp` | ~300 × 300 | Memory tile on both menus (code-drawn cards until then) |
| Voice lines | MP3 | "Let's play memory!", "Look!", "Can you find the pairs?", "Take a peek!", "Where's the other X?" × 15, item names for the 10 food/drink/comfort items |

**All Games menu background — recommendation:** a **playroom**. Toy shelves along the back wall and a soft rug, in the same art style and colours as `bg_room`, so it feels like the room next door to the bedroom. Keep the middle area plain and low-detail so the game tiles stand out.
