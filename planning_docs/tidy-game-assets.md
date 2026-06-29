# Tidy Time Assets

Assets needed for the Tidy Time mini-game. Style notes match the existing game — keep them consistent so everything feels like the same world.

## Style notes (recap)

- **Voice:** single warm, friendly narrator. Same voice as the existing game.
- **Pace:** slow and clear — the child is 3 years old.
- **Spelling:** UK English throughout (biscuit, lovely, shall we).
- **Format:** MP3.
- **Pauses:** slight pause between sentences within a phrase.

---

## Audio to create

### Tidy chosen (2 — plays when the child taps the toy box tile on the mini-game select screen)

| Filename | Phrase |
|---|---|
| `tidy_chosen_1.mp3` | Tidy time! |
| `tidy_chosen_2.mp3` | Yay, let's tidy up! |

### Opening (2 — plays as the scene loads and toys tumble in)

Pick one at random per session.

| Filename | Phrase |
|---|---|
| `tidy_opening_1.mp3` | Let's tidy up! Put all the toys away in the toy box. |
| `tidy_opening_2.mp3` | Look at all these toys! Let's pop them in the box. |

### Toy names (5 — plays when each toy is dropped in the box, alongside the toy name appearing on screen)

Short, clear, enthusiastic naming.

| Filename | Phrase |
|---|---|
| `tidy_name_ball.mp3` | Ball! |
| `tidy_name_book.mp3` | Book! |
| `tidy_name_blocks.mp3` | Blocks! |
| `tidy_name_car.mp3` | Car! |
| `tidy_name_teddy.mp3` | Teddy! |

### In it goes (3 — plays occasionally on successful drops, ~50% chance)

| Filename | Phrase |
|---|---|
| `in_it_goes_1.mp3` | In it goes! |
| `in_it_goes_2.mp3` | And that one! |
| `in_it_goes_3.mp3` | Get the other one too! |

### Next one (2 — plays occasionally after a successful drop, ~30% chance)

| Filename | Phrase |
|---|---|
| `next_one_1.mp3` | Next one! |
| `next_one_2.mp3` | Keep going! |

### Oops (2 — plays occasionally when a toy is dropped on the floor instead of the box, ~40% chance)

| Filename | Phrase |
|---|---|
| `tidy_oops_1.mp3` | Oopsie! Try again! |
| `tidy_oops_2.mp3` | Almost! Pop it in the box. |

### All tidy (2 — plays after the last toy goes in, celebration moment)

| Filename | Phrase |
|---|---|
| `all_tidy_1.mp3` | All nice and clean! Well done! |
| `all_tidy_2.mp3` | Hooray, all tidy! Thank you so much! |

### Sound effect (1)

Not a narrator voice — a short, soft sound effect.

| Filename | Description |
|---|---|
| `plop.mp3` | A satisfying soft "plop" or "thunk" sound for a toy landing in the box. Mid-range frequency so it carries on small phone speakers. Warm and pleasant, not harsh. Roughly 0.3 seconds long. Will be heard many times in a row — must not become annoying. |

---

## Images

### Needed (1)

| Filename | Format | Description |
|---|---|---|
| `mini_toybox` | .png or .webp | A friendly open-top toy box. Same cartoon style as the existing items and characters. Transparent background. Roughly square aspect ratio, suitable to be displayed at ~280×280px. Wooden or pastel-coloured box, clearly open from the top so it's obvious where toys go. Cute, inviting, not too detailed. Used both as the tile icon on the mini-game select screen *and* as the actual box in the tidy game. |

### Reused (no new files)

- All 5 toy images (`item_ball`, `item_book`, `item_blocks`, `item_car`, `item_teddy`) are reused as-is.
- The bedroom background is reused.
- The character emotions (`neutral`, `happy`, `jumping`) are already in place.

---

## Notes

- All audio files go in `assets/audio/` alongside the existing files.
- UK English throughout. Match the existing voice exactly — re-record with the same voice settings if possible.
- The `plop` sound will play many times in quick succession during the mini-game. Test it on a phone speaker before settling — it has to remain pleasant on repeat.
- After adding the files, register the keys in the `PHRASES` object in `data/phrases.js`. BootScene loads everything declared in `PHRASES` automatically.
- Bump `CACHE_NAME` in `sw.js` so the service worker re-caches the new assets on next open.
