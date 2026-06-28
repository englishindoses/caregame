# Ball Catch Mini-Game — Plan

A new mini-game for "Take Care of Me". The child plays catch with the chosen character. Triggered after 3 trays of the main game are cleared.

## Goals

- Add a "what shall we play?" choice screen between rounds of the main game.
- Add a Catch mini-game where the child throws a ball to the character and the character throws it back.
- Keep the calm, cozy feel and slow rhythm of the main game.
- Teach action vocabulary (throw, catch, ready, your turn, good throw, good catch).
- No failure states — missed throws bounce around playfully and the child tries again.
- Automatic exit after 4–5 catches, returning to the main game.

## Architecture changes

### New files

```
/scenes
  MiniGameSelectScene.js   ← "What shall we play now?" screen
  CatchScene.js            ← The catch mini-game
/data
  minigames.js             ← MINIGAMES array (just 'catch' for now)
```

### Modified files

- `index.html` — add `<script>` tags for the new scenes and `minigames.js` (in load order: data files first, then scenes).
- `main.js` — register `MiniGameSelectScene` and `CatchScene` in the scene list. Enable Arcade Physics in the Phaser config (`physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } }`).
- `scenes/BootScene.js` — load new audio assets (see asset doc) and the `boing` sound effect.
- `scenes/PlayScene.js` — track `traysCleared`. When it reaches 3, instead of dealing the next tray, transition to `MiniGameSelectScene` carrying `{ characterId }`. Reset counter on return.
- `data/phrases.js` — add new phrase arrays (see Audio section).
- `sw.js` — bump `CACHE_NAME` so the new assets are picked up.

### Scene flow

```
BootScene → SelectScene → PlayScene → (after 3 trays) → MiniGameSelectScene → CatchScene → PlayScene
```

## MiniGameSelectScene

**Purpose:** the child picks what to play next. For now there's only one option (ball), but the layout should support 3–4 options easily.

**Visuals:**
- Same bedroom background as PlayScene (so the transition feels continuous, not jarring).
- Chosen character sits in the bottom-left corner, smaller than usual (~60% normal size). Idle bounce continues gently.
- Title text near the top: "What shall we play?" — large white text with black outline, same style as the main game's request text.
- One large tile in the centre of the screen: the ball image (reuse `item_ball`), sized generously (~300×300px at reference resolution), on a soft white rounded-rectangle background so it stands out.
- Tile has a gentle idle pulse (scale tween between 1.0 and 1.05, 1.5s cycle).

**Audio:**
- On scene entry, play one of the `playInvite` phrases (e.g. "What shall we play?"). Cycles through variants like the chosen audio does.
- All input locked until the invite audio finishes (use the existing `_inputLocked` pattern).

**Interaction:**
- Tap the ball tile → scale pulse, play one of the `playCatch` phrases ("Let's play catch!"), then transition to `CatchScene` with `{ characterId }`.

**Future-proofing:**
- Lay out tiles in a grid that supports up to 4 options. With one option, it sits centred. With two, they sit side by side. With three or four, a 2×2 grid. Compute positions from `this.scale.width` / `this.scale.height` so the layout adapts automatically when more mini-games are added.
- Each mini-game in `MINIGAMES` should declare its own image key, audio key, and target scene, so adding a new one is just a data-file edit.

## CatchScene

**Purpose:** the child and the character take turns throwing a ball.

### Layout

- Same bedroom background.
- Character positioned in the upper-centre of the screen (around y = 35% of screen height), facing forward.
- Ball starts at the bottom-centre (around y = 80% of screen height) on the "floor".
- Top-right: small door icon (same long-press behaviour as PlayScene — long-press returns to SelectScene). Optional; can be added later if it complicates things.

### Physics

- Arcade Physics, no gravity (top-down feel — the ball moves freely in the room).
- World bounds set to the visible room area, with `bounce.x = 0.7`, `bounce.y = 0.7`.
- Ball has `drag.x` and `drag.y` set high enough that a throw decays to a stop within 2–3 seconds if it doesn't hit anything.
- Ball body is circular (`setCircle(radius)`).

### Throw mechanics — two options for the child

**1. Tap-throw (simplest):**
- Tap on the ball without dragging → ball flies straight up toward the character with a fixed velocity. Always reaches the character (success path).

**2. Swipe-throw:**
- Pointer down on ball, drag, release → record the drag vector and release velocity, apply to the ball's body.
- A short swipe = gentle throw. A long fast swipe = strong throw.
- If the throw vector points roughly upward (within ~45° of straight up), the ball heads toward the character.
- Sideways or weak throws → the ball bounces around the room (see below).

**Implementation detail:** distinguish tap vs swipe by the distance dragged before release. If `pointer.getDistance() < 20`, treat as tap. Otherwise, swipe.

### Catch detection

- Every frame, check distance from ball centre to character centre.
- If distance < `CATCH_RADIUS` (suggest 150px at reference resolution) AND ball is currently moving, character catches.
- On catch:
  - Stop the ball (set velocity to 0).
  - Move ball to be in the character's "hands" (a fixed offset from the character sprite, e.g. just below the chin).
  - Set character to `jumping` emotion.
  - Play a `catchExcite` audio clip ("Got it!" / "I caught it!" — varies).
  - After 800ms, character throws back (see below).

### Bouncing off walls

- The ball collides with the world bounds and bounces with the configured `bounce` value.
- On every bounce, play the `boing` sound effect.
- Each bounce loses energy due to drag — the ball comes to rest naturally.
- When the ball comes to rest (velocity magnitude < 5), it stays where it is. The child can tap or drag it again to throw it.
- **The character does not react during a free bounce** beyond watching — they stay in the neutral or happy pose. Keep the boing as the only feedback. (Future: occasional soft sound from character.)

### Character's throw back

- After holding the ball for ~800ms, the character throws it back.
- The ball moves from the character's hands toward a target near the bottom of the screen with a fixed velocity. Use a Phaser tween rather than physics for this throw — predictable and always lands at the player's "catching" position.
- During the throw-back, drag input on the ball is disabled.
- When the ball reaches the target (the "player's hands" — bottom-centre, around y = 90%), trigger the player-catch:
  - Ball stops.
  - Play a `playerCatch` audio clip ("Good catch!" / "Well done!" — varies).
  - Character returns to `happy` emotion.
  - Catch counter increments.
  - After 600ms, ball is ready to be thrown again (re-enable drag input).

### Win condition / exit

- After **5 successful catches** (each full back-and-forth counts as one catch), the next time the character catches the ball:
  - Skip the throw-back.
  - Character keeps the ball, switches to `sleepy` emotion (drooping eyes — they're tired).
  - Play a `playTired` audio clip ("Phew, I'm tired!" / "That was so much fun, let's have a rest.").
  - After the audio finishes, transition back to `PlayScene` with `{ characterId, fromMinigame: true }` so PlayScene knows to resume the request flow without re-playing the chosen audio.

### Input locking

- Reuse the `_inputLocked` pattern from PlayScene. Lock during:
  - The initial invite audio.
  - Character holding the ball (between catch and throw-back).
  - Throw-back animation.
  - The final "tired" sequence.

### Visual polish

- Ball should rotate while in motion. Set `body.angularVelocity` proportional to throw speed.
- When the character catches, a small scale pulse on the character (same as the celebration in PlayScene).
- When the player catches, a small scale pulse on the ball.
- Soft shadow under the ball when at rest on the floor (optional — a faint dark ellipse).

## Modifications to PlayScene

Add a counter `this.traysCleared = 0`. Increment it inside the all-done flow, just before dealing the next tray. If `this.traysCleared >= 3`:

```js
this.traysCleared = 0;
this.scene.start('MiniGameSelectScene', { characterId: this.characterId });
return;
```

When PlayScene receives `{ fromMinigame: true }` in its `init`, skip the chosen audio and the initial empty-tray pause. Go straight to dealing a fresh tray and picking a request.

## Modifications to phrases.js

Add the following arrays to `PHRASES`:

```js
playInvite:    ['play_invite_1', 'play_invite_2', 'play_invite_3'],
playCatch:     ['play_catch_1', 'play_catch_2'],
catchExcite:   ['catch_excite_1', 'catch_excite_2', 'catch_excite_3'],
playerCatch:   ['player_catch_1', 'player_catch_2', 'player_catch_3'],
playTired:     ['play_tired_1', 'play_tired_2', 'play_tired_3'],
```

Add a cycling helper for `playInvite` and `playCatch` (same pattern as `nextChosen`), or just pick a random one — the variation is enough.

## Data: minigames.js

```js
const MINIGAMES = [
  {
    id: 'catch',
    name: 'Catch',
    image: 'item_ball',
    inviteAudio: 'play_catch',
    scene: 'CatchScene',
  },
  // Future: 'tidy', 'story', 'writing' added here.
];
```

## Suggested build order

1. Add the new audio assets to `assets/audio/` and update BootScene to load them.
2. Build `MiniGameSelectScene` standalone first — title, single ball tile, tap triggers a `console.log`. Make sure the layout works.
3. Wire the trigger from PlayScene (after 3 trays) and the return path.
4. Build `CatchScene` skeleton — character, ball with physics, simple tap-throw, fixed catch detection, hard-coded throw-back. No audio yet.
5. Add swipe-throw on top of tap-throw.
6. Add the wall-bounce + boing.
7. Add all audio and input locking.
8. Add the 5-catches-then-tired exit.
9. Polish: ball rotation, scale pulses, optional shadow.

## Testing notes

- Test the swipe sensitivity on a real phone. A 3-year-old's swipe is much less precise than an adult's — the catch radius and "roughly upward" threshold should be very forgiving.
- If the ball bounces around for too long without anything happening, the child will lose interest. Drag values should bring it to rest within ~3 seconds.
- Boing sound should be soft and fun, never harsh. A muted "doink" works better than a loud cartoon boing.
- Make sure the `_inputLocked` flag is properly cleared on every scene exit, or returning to PlayScene will leave it locked.

## Out of scope (for later)

- The "again?" prompt after the mini-game ends — for now, the child can ask for the ball again from the main game if they want more.
- The door long-press exit from CatchScene — add later if needed.
- Per-character voice variation.
- The full 4-tile mini-game select grid (only catch is wired up for now).
- Toy box, story book, and writing board mini-games — separate plans later.
