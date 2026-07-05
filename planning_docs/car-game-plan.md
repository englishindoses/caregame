# Little Driver — Game Plan

A dashboard-and-windscreen mini-game for 3-year-olds. Close-up first-person view from the driver's seat. The child can steer, honk the horn, flick the wipers, and use the indicators. No fail states, no scoring — a joyful pretend-driving toy.

## Tech stack

- **Phaser 3.60** — same as the main game, loaded via CDN.
- **Vanilla JavaScript** — plain `<script>` tags, no bundler.
- **Audio**: MP3 files, reusing the same `interruptAudio` / `queueAudio` pattern from the main game (essential — the horn will be pressed a lot).
- **Images**: WebP where possible, PNG fallback.
- **Orientation**: **landscape**, locked for this scene only. A "rotate your device" prompt shows if held portrait.

## File structure (added to existing project)

**Build status:** Phase 1 is built and wired in (`CarScene` + `car-config.js`, `car` tile on the select screen, tap-to-open exit menu). `car_dashboard` + `car_steering_wheel` art are in (WebP). Scenery is still code-drawn; all audio is still synth/silent. See the changelog (2026-07-04) and the phase checklist below.

```
/scenes
  CarScene.js               ← the whole mini-game (one scene for now).   ✅ built
/data
  car-config.js             ← CAR_CONFIG constants (wheel angle, wiper/indicator timing, parallax).   ✅ built
/assets
  /images
    car_dashboard.webp      ← dashboard frame (driver POV), transparent windscreen hole.   ✅ in
    car_steering_wheel.webp ← steering wheel (renamed from car_wheel), rotates.             ✅ in
    car_sky.webp            ← distant sky strip, seamless horizontal tile.        ⬜ optional (code-drawn for now)
    car_hills.webp          ← mid-distance hills strip.                           ⬜ optional (code-drawn for now)
    car_roadside.webp       ← foreground trees / bushes strip.                    ⬜ optional (code-drawn for now)
    car_road.webp           ← road with dashed lines.                            ⬜ optional (code draws this)
  /audio
    horn.mp3                ← ⬜ synth beep fallback in use
    wiper_swish.mp3         ← ⬜ synth swish fallback in use
    indicator_tick.mp3      ← ⬜ synth tick fallback in use
    engine_hum.mp3          ← soft looping background (optional).   ⬜ silent until added
    drive_chosen_1/2.mp3    ← select-tile "let's drive!" line.      ⬜ silent until added
```

## Scene layout (landscape, reference 1280 × 720)

- **Top half of screen**: windscreen view. Sky at the top, hills mid, roadside strip near the bottom of the view, road disappearing into the horizon.
- **Bottom half**: dashboard frame with the steering wheel sitting slightly off the bottom edge (only the top ~70% of the wheel is visible, like a real driving view).
- **Horn button**: circle in the middle of the wheel, rotates *with* the wheel.
- **Indicator stalks**: two chunky buttons either side of the wheel on the dashboard — left and right arrows that flash when active.
- **Wiper button**: small square button on the dashboard.

Everything positioned from `this.scale.width` / `this.scale.height` so it scales.

## Controls (Phase 1 — the toy)

### Steering — decorative + optional buttons

For a 3-year-old, real steering that changes the scene is a stretch. Approach:

- The wheel is **draggable rotationally** — the child grabs anywhere on the rim and turns it. Feels real, no wrong answer.
- The wheel **auto-returns to centre** when released (tween back to 0 over 400ms with `Back.easeOut`).
- Rotation is **clamped** to ±120° so it can't spin forever.
- The scenery **shifts subtly** based on wheel angle (parallax layers offset a few pixels) — enough that the child senses cause and effect, not enough that they can drive off the road.
- No left/right buttons in Phase 1. If field-testing shows the child can't grab the wheel, add them in Phase 2.

### Horn — centre of wheel

- Big circular button in the wheel centre.
- Rotates with the wheel (child-of-wheel container).
- Tap → `interruptAudio('horn')`. This is critical: repeated presses must feel snappy, not queue up.
- Small scale-pulse on the horn button for tactile feedback.

### Wipers — tap to start, auto-stop

- Wiper button on the dashboard.
- Tap → wipers sweep for **3 full cycles** (right sweep + return = 1 cycle), then stop at rest position.
- Tapping again during a sweep is ignored (or restarts the count — pick after testing).
- Each sweep plays `wiper_swish.mp3` at low volume via `queueAudio` so it doesn't drown out other sounds.
- Wipers rendered as **code-drawn rectangles** — no image needed. Two blades, pivoted at the base of the windscreen, tweened together.
- Wipers sit above the scenery but below the dashboard frame.

### Indicators — tap on, auto-off

- Two chunky buttons on the dashboard, left and right.
- Tap → indicator flashes on that side (button glows, `indicator_tick.mp3` loops via `queueAudio` re-queuing itself, or use Phaser sound loop).
- Auto-stops after **6 seconds** OR when the opposite indicator is tapped.
- Tapping the same indicator again while it's on turns it off early.
- The tick-tock sound is a specific delight — small children remember it.

## Phase 2 — weather cycle (add after Phase 1 works)

A weather button on the dashboard cycles: **sunny → rainy → night → sunny**.

- **Sunny**: default, no overlay.
- **Rainy**:
  - Semi-transparent grey overlay across the windscreen.
  - Rain drop particles (Phaser particle emitter — no images, small ellipses).
  - Wipers become *actually useful* — they clear rain by resetting drop alpha in the swept arc (or a simpler cheat: rain density drops during a sweep).
- **Night**:
  - Dark blue overlay at ~50% alpha over scenery.
  - Dashboard lights glow (add a warm tint to dashboard-frame lights).
  - Headlights: two soft yellow cones extending onto the road ahead.

**All three weather states can be done with code-only tints and particles — no new images required.** Dedicated background variants would look nicer but aren't necessary for Phase 2. Decide after seeing tint-based version.

## Phase 3 — polish and life (add after Phase 2)

- **Animals / passing objects**: a cow in a field, a plane overhead, a dog on the pavement. Tappable for a sound. Turns the scenery into a mini hidden-object game.
- **Passenger character**: one of Dolly / Giraffe / Bunny visible in the passenger seat, reacting to horn (surprised) and night (sleepy). Ties this to the main game with almost no new art (reuse existing emotion sprites).
- **Traffic lights**: a light in the distance changes red / amber / green. No fail state, just a moment of attention.
- **Steering wheel taps**: tapping (not dragging) different parts of the wheel triggers small sounds — a bit of extra reward.

## Audio system

Reuse the exact `queueAudio` / `interruptAudio` / `_inputLocked` pattern from the main game. Specifically:

- **`interruptAudio`** for horn (snappy) and steering wheel tap sounds if added.
- **`queueAudio`** for wiper swish and indicator ticks.
- **No input lock in this scene** — the whole point is that everything is interactive at once. This is a departure from the main game and needs to be explicit in the code.
- Optional soft `engine_hum.mp3` looping at low volume in the background — adds enormous immersion for a small effort.

## Responsive scaling

- Reference: **1280 × 720 landscape**.
- `Scale.FIT` — same approach as the main game.
- Background fill colour matches the sky so letterboxing blends in.
- On entering the scene, force landscape lock:

```js
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(() => {});
}
```

If lock fails (iOS Safari doesn't support it), show a "please turn your phone sideways" screen with a rotate icon until the device is landscape.

## Build phases

1. ✅ **Scene skeleton** — landscape flip (`setGameSize`) + rotate-phone fallback, code-drawn dashboard/wheel/scenery placeholders, all interactions wired.
2. ✅ **Steering wheel** — draggable rotation, auto-return-to-centre, clamped angle, subtle scenery parallax shift.
3. ✅ **Horn** — button in wheel centre, rotates with wheel, synth beep (real `horn.mp3` when recorded).
4. ✅ **Wipers** — code-drawn blades, tap to start 3-cycle sweep, synth swish.
5. ✅ **Indicators** — left/right buttons, glow + tick sound, auto-off after 6s.
6. 🔶 **Real art in** — `car_dashboard` + `car_steering_wheel` done (WebP); **scenery strips still code-drawn** (optional).
7. ⬜ **Weather cycle** (Phase 2) — sunny/rainy/night with tints + particles.
8. ⬜ **Life** (Phase 3) — animals, passenger, traffic lights.
9. ✅ **Enter/exit** — enter via the `car` select tile; exit via the top-right **menu** (Main Game / Mini-Game Select / Character Select). *(Automatic ending still TODO — see below.)*

## Things to watch out for

- **Horn button must be huge and centred**. It will be the most-pressed thing in the entire game.
- **Wheel drag on small screens is fiddly** — if 3-year-old field testing shows the child can't grab it, fall back to left/right buttons quickly. Don't get precious about the drag.
- **Auto-return-to-centre is essential** — without it the wheel drifts and the child loses the "straight ahead" reference.
- **Indicator sound loop must actually stop** — a stuck tick-tock will drive parents mad.
- **Rain particles can chew CPU on older phones** — keep the max count modest (~40 drops on screen).
- **Landscape lock is not supported on iOS Safari** — plan for the rotate-your-device fallback from day one, not as an afterthought.
- **Engine hum volume** — must be quiet enough not to compete with other audio. 0.15 gain is a reasonable starting point.

## Scenery art prompts (optional polish)

The scenery (sky / hills / roadside / road seen through the windscreen) is code-drawn placeholder. To replace it with art matching the dashboard/wheel style, generate these on a **transparent (alpha) PNG** background (then convert to WebP). Prepend the shared style block to each.

**Shared style block:**
> Soft 3D-rendered children's storybook illustration, gentle cartoon style for toddlers. Warm, cozy, rounded soft shapes, smooth matte surfaces, soft ambient lighting and soft shadows. Cheerful pastel palette (soft sky blue, warm cream/beige, gentle greens, soft gold). Same art style as a cute toy-car dashboard. Simple, clean, uncluttered, no text, no words, no letters. Flat straight-on view.

- **`car_sky`** (~2048×512, seamless left–right, opaque): calm pastel-blue daytime sky with a few soft fluffy rounded white clouds in the upper portion; horizontal seamless tileable strip, no seam, no ground/horizon.
- **`car_hills`** (~2048×512, transparent above): a row of gentle rounded green rolling hills along the bottom, soft like green cushions, a few heights; everything above transparent; seamless left–right.
- **`car_roadside`** (~2048×512, transparent bg): foreground rounded bushes + a couple of lollipop trees along the bottom, sized as if close; everything above/between transparent; seamless left–right.
- **`car_road`** (~1024×1024, transparent sides): friendly grey asphalt road in perspective, narrow at the top (horizon) widening to the bottom, soft rounded edges, simple dashed pale-yellow centre line; left/right of the road transparent; straight, no curves.

Keep the horizon height consistent across sky/hills/road (hills' tops ~⅓ down). Stack order behind the dashboard: sky → hills → roadside → road (nearest).

## Deferred until last

- **Entering the car** from the main game — *done for now via the mini-game select screen*: the existing toy-car art (`item_car`) is a tile on the "What shall we play?" screen; tapping it launches CarScene. A fancier bespoke "go for a drive" trigger can come later.
- **Exiting the car** back to the main game — *done*: a door button in the top-right (same look as the main game) opens a menu with **Main Game**, **Mini-Game Select** and **Character Select**, each routing to the matching scene. This replaces the hold-to-exit pattern for this scene only.
- **Automatic ending mechanism (TODO).** The car game currently has *no* self-ending — unlike Catch (character tires after 5 catches) or Tidy (all toys away), it only ends when the child picks a destination from the exit menu. We later need an automatic wind-down (e.g. after a set drive time, or the passenger character getting sleepy) so a session doesn't run forever unattended. Design deferred.
