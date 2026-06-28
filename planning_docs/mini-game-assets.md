# Mini-Game Assets

Assets needed for the Ball Catch mini-game. Style notes match the existing game — keep them consistent so everything feels like the same world.

## Style notes (recap)

- **Voice:** single warm, friendly narrator. Same voice as the existing game.
- **Pace:** slow and clear — the child is 3 years old.
- **Spelling:** UK English throughout (biscuit, lovely, shall we).
- **Format:** MP3.
- **Pauses:** slight pause between sentences within a phrase.

---

## Audio to create

### Play invite (3 — plays when the "What shall we play?" screen opens)

Cycles or picks randomly between variants.

| Filename | Phrase |
|---|---|
| `play_invite_1.mp3` | What shall we play? |
| `play_invite_2.mp3` | What shall we play now? |
| `play_invite_3.mp3` | Ooh, let's play together! What shall we do? |

### Catch chosen (2 — plays when the child taps the ball tile)

| Filename | Phrase |
|---|---|
| `play_catch_1.mp3` | Let's play catch! |
| `play_catch_2.mp3` | Yay, catch! Throw the ball to me! |

### Character catches the ball (3 — plays each time the character successfully catches)

| Filename | Phrase |
|---|---|
| `catch_excite_1.mp3` | Got it! |
| `catch_excite_2.mp3` | I caught it! Yay! |
| `catch_excite_3.mp3` | Lovely throw! |

### Player catches the ball (3 — plays after the character throws it back)

| Filename | Phrase |
|---|---|
| `player_catch_1.mp3` | Good catch! |
| `player_catch_2.mp3` | Well done! Catch! |
| `player_catch_3.mp3` | Your turn! Throw it back! |

### Tired / mini-game end (3 — plays after 5 catches, signals return to main game)

| Filename | Phrase |
|---|---|
| `play_tired_1.mp3` | Phew, I'm tired! That was fun. |
| `play_tired_2.mp3` | That was lovely. Let's have a little rest. |
| `play_tired_3.mp3` | I had so much fun. Shall we do something else now? |

### Sound effect (1)

Not a narrator voice — a short, soft sound effect.

| Filename | Description |
|---|---|
| `boing.mp3` | A gentle, soft "boing" or "doink" sound for the ball bouncing off walls. Should be playful and warm, not loud or cartoonish. Roughly 0.3 seconds long. Easy to hear repeatedly without becoming annoying. |

---

## Images

**No new images needed for the catch mini-game.**

- The ball reuses `item_ball.png`.
- The character emotions are already in place (`neutral`, `happy`, `jumping`, `sleepy` are all used).
- The bedroom background is reused.

### For future mini-games (not needed yet)

When more mini-games are added, the select screen will need tile icons for each. Possible needs:

- `mini_tidy.png` — a toy box icon, transparent background, same cartoon style as items.
- `mini_story.png` — a storybook icon (could reuse `item_book` or make a slightly larger version).
- `mini_writing.png` — a pencil or writing board icon.

---

## Notes

- All audio files go in `assets/audio/` alongside the existing files.
- UK English throughout. Match the existing voice exactly — re-record with the same voice settings if possible.
- After adding the files, they'll be picked up automatically by BootScene as long as the keys are added to the `PHRASES` object in `data/phrases.js`.
- Bump `CACHE_NAME` in `sw.js` so the service worker re-caches the new assets on next open.
