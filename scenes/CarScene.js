// Little Driver — a pretend-driving toy for 3-year-olds. First-person view from
// the driver's seat: windscreen on top, dashboard + steering wheel below. No
// fail states, no scoring — the child steers, honks, wipes and indicates.
//
// Portrait 720×1280 like every other scene: the dashboard art sits full-width
// along the bottom (its transparent windscreen hole shows the code-drawn road),
// and the scenery fills the space above. No orientation flip / rotate prompt.
//
// Audio is fire-and-forget and NEVER locks input (a deliberate departure from
// the main game — everything must stay interactive at once). Where a recorded
// clip is missing, the sound is synthesized via the Web Audio API so the toy is
// never silent before the assets exist.
class CarScene extends Phaser.Scene {
    constructor() {
        super('CarScene');
    }

    init(data) {
        this.characterId = data.characterId || localStorage.getItem('tcm_character') || 'dolly';
        this.sound.mute  = localStorage.getItem('tcm_mute') === '1';
    }

    // The car's own SFX — loaded on selection, not at boot. Everything visual is
    // code-drawn, so there are no images to load. Missing clips fall back to the
    // synthesized tones in the play* helpers.
    preload() {
        if (!this._miniLoadHooked) {
            this._miniLoadHooked = true;
            this.load.on('loaderror', f => console.warn(`Missing asset: ${f.key}`));
        }
        ['car_dashboard', 'car_steering_wheel'].forEach(key => {
            if (!this.textures.exists(key)) this.load.image(key, `assets/images/${key}.webp`);
        });
        ['horn', 'wiper_swish', 'indicator_tick', 'engine_hum'].forEach(key => {
            if (!this.cache.audio.exists(key)) this.load.audio(key, `assets/audio/${key}.mp3`);
        });
    }

    create() {
        // Portrait, like every other scene — no orientation flip, no rotate
        // prompt. The dashboard art sits full-width along the bottom and the
        // road shows through its windscreen hole; scenery fills the top.
        const W = this.scale.width;
        const H = this.scale.height;
        this.W = W;
        this.H = H;

        // Key vertical bands (portrait). The dashboard image occupies the bottom
        // ~38% (its top ~half is a transparent windscreen arch). dashTop is where
        // the road view converges — aligned with the top of the instrument panel
        // (the bottom of the windscreen hole) so the road fills the hole.
        this.horizon = H * 0.30;
        this.dashTop = H * 0.80;

        this.layers   = [];      // parallax scenery {g, factor}
        this._steer   = null;    // active wheel-drag state
        this._wiping  = false;
        this._activeStalk   = null;  // stalk currently being dragged
        this._indicator     = null;  // null | 'left' | 'right'
        this._indActiveTell = null;  // the lit dashboard tell-tale arrow
        this._indTick = this._indTimeout = this._indGlow = null;

        this.buildScenery();
        this.buildWipers();
        this.buildDashboard();
        this.buildWheel();             // sets _wheelCx/Cy/R used by the two below
        this.buildIndicatorLights();   // green tell-tales on the dash, behind the wheel
        this.buildStalks();            // wiper stalk (left) + indicator stalk (right)
        this.buildExitButton();

        // Soft engine hum if the clip exists (no synth fallback — silence is fine).
        if (this.cache.audio.exists('engine_hum')) {
            this._engine = this.sound.add('engine_hum', { loop: true, volume: 0.15 });
            if (!this.sound.locked) this._engine.play();
            else this.sound.once('unlocked', () => this._engine && this._engine.play());
        }

        // Auto-return to the main game after a set play time (parent will tune
        // this after testing). Manual exit via the door menu still works too.
        this._autoEnd = this.time.delayedCall(CAR_CONFIG.AUTO_END_MS, () => this.autoEnd());

        // Cleanly undo the landscape flip and stop loops on the way out.
        this.events.once('shutdown', () => this.teardown());
    }

    autoEnd() {
        this.scene.start('PlayScene', { characterId: this.characterId, fromMinigame: true });
    }

    // ── Scenery (placeholder shapes; swap for art later) ─────────────────────

    buildScenery() {
        const { W, H, horizon, dashTop } = this;

        // Sky.
        const sky = this.add.graphics().setDepth(1);
        sky.fillStyle(0x8fd3f4, 1);
        sky.fillRect(-160, -10, W + 320, horizon + 12);
        this.layers.push({ g: sky, factor: 0.25 });

        // Distant hills.
        const hills = this.add.graphics().setDepth(2);
        hills.fillStyle(0x6fae55, 1);
        hills.fillEllipse(W * 0.30, horizon, 540, 190);
        hills.fillEllipse(W * 0.72, horizon, 620, 230);
        this.layers.push({ g: hills, factor: 0.5 });

        // Grass ground.
        const grass = this.add.graphics().setDepth(3);
        grass.fillStyle(0x86c25e, 1);
        grass.fillRect(-160, horizon, W + 320, dashTop - horizon + 4);
        this.layers.push({ g: grass, factor: 0.9 });

        // Road (static trapezoid). The dashed line + roadside bushes are drawn on
        // top in update() and scroll toward the viewer.
        const road = this.add.graphics().setDepth(4);
        road.fillStyle(0x555560, 1);
        road.fillPoints([
            new Phaser.Geom.Point(W / 2 - 30, horizon),
            new Phaser.Geom.Point(W / 2 + 30, horizon),
            new Phaser.Geom.Point(W * 0.90, dashTop),
            new Phaser.Geom.Point(W * 0.10, dashTop),
        ], true);
        this.layers.push({ g: road, factor: 1.0 });

        // Scrolling layer: centre dashes + roadside bushes stream from the horizon
        // toward the viewer (redrawn each frame in update()) so the world moves.
        this.roadFx = this.add.graphics().setDepth(5);
        this.layers.push({ g: this.roadFx, factor: 1.0 });
        this._scrollSpeed = 0.42;                // t-units/sec (0 = horizon, 1 = nearest)
        this._dashes = [];
        for (let i = 0; i < 7; i++) this._dashes.push({ t: i / 7 });
        this._bushes = [];
        for (let i = 0; i < 6; i++) {
            this._bushes.push({ t: i / 6, side: i % 2 ? 1 : -1, r: Phaser.Math.Between(16, 30) });
        }
        // A single tree drifts past now and then, alternating side with a gap
        // (so there's never one on both sides at once). Starts below the horizon.
        this._tree = { t: -0.9, side: 1 };
    }

    // Project a point on the road: t (0 horizon → 1 nearest), laneFrac (0 centre,
    // ±1 road edge, beyond for the verge). Returns screen x/y + a perspective scale.
    roadProject(t, laneFrac) {
        const y    = Phaser.Math.Linear(this.horizon, this.dashTop, t);
        const half = Phaser.Math.Linear(30, this.W * 0.40, t);
        return { x: this.W / 2 + laneFrac * half, y, scale: Phaser.Math.Linear(0.12, 1, t) };
    }

    update(time, delta) {
        if (!this.roadFx) return;
        const dt = Math.min(delta / 1000, 0.05);   // clamp so a background tab doesn't jump
        const g = this.roadFx;
        g.clear();

        // Occasional tree (further out than the bushes). Alternates side + waits
        // a beat between appearances so there's never one on both sides at once.
        const tr = this._tree;
        tr.t += this._scrollSpeed * 0.85 * dt;
        if (tr.t > 1) { tr.t = -0.9; tr.side *= -1; }
        if (tr.t >= 0) this.drawTree(g, tr.t, tr.side);

        // Roadside bushes, so the dashes sit in front of them.
        this._bushes.forEach(b => {
            b.t += this._scrollSpeed * 0.85 * dt;
            if (b.t > 1) { b.t -= 1; b.r = Phaser.Math.Between(16, 30); }
            const p  = this.roadProject(b.t, b.side * 1.35);
            const rr = b.r * p.scale;
            g.fillStyle(0x5f9e46, 1); g.fillCircle(p.x, p.y, rr);
            g.fillStyle(0x4f8a3a, 1); g.fillCircle(p.x, p.y - rr * 0.3, rr * 0.7);
        });

        // Centre dashes.
        g.fillStyle(0xf2e4c4, 1);
        this._dashes.forEach(d => {
            d.t += this._scrollSpeed * dt;
            if (d.t > 1) d.t -= 1;
            const p = this.roadProject(d.t, 0);
            const w = Phaser.Math.Linear(3, 22, d.t);
            const h = Phaser.Math.Linear(6, 46, d.t);
            g.fillRect(p.x - w / 2, p.y - h / 2, w, h);
        });
    }

    drawTree(g, t, side) {
        const p = this.roadProject(t, side * 1.45);   // out beyond the verge (clear of the dash hood)
        const s = p.scale;
        const th = 62 * s, tw = 14 * s;
        g.fillStyle(0x8a5a3b, 1);
        g.fillRect(p.x - tw / 2, p.y - th, tw, th);               // trunk
        const cyc = p.y - th;
        g.fillStyle(0x4f8a3a, 1); g.fillCircle(p.x, cyc - 20 * s, 40 * s);
        g.fillStyle(0x5f9e46, 1);
        g.fillCircle(p.x - 22 * s, cyc - 2 * s, 28 * s);
        g.fillCircle(p.x + 22 * s, cyc - 4 * s, 26 * s);
    }

    updateParallax() {
        const ratio = this.wheel ? this.wheel.rotation / this._wheelMax : 0;
        this.layers.forEach(l => {
            l.g.x = -ratio * CAR_CONFIG.PARALLAX_MAX_PX * l.factor;
        });
    }

    // ── Wipers (code-drawn, no image) ────────────────────────────────────────

    buildWipers() {
        const { W, horizon, dashTop } = this;
        const len = (dashTop - horizon) * 0.95;   // sweep the windscreen, not the whole screen
        // Parked position is DOWN (blades near-horizontal along the base of the
        // windscreen); a sweep lifts them up and back down.
        this._wiperDown = Phaser.Math.DegToRad(79);    // parked low, tips just peeking into the glass
        this._wiperUp   = Phaser.Math.DegToRad(-22);   // top of the sweep, near vertical

        const blade = (px) => {
            const r = this.add.rectangle(px, dashTop, 9, len, 0x20242c)
                .setOrigin(0.5, 1).setDepth(8);
            r.rotation = this._wiperDown;
            return r;
        };
        this._wipers = [blade(W * 0.42), blade(W * 0.58)];
    }

    startWipers() {
        if (this._wiping) return;
        this._wiping = true;
        const t = { v: 0 };
        this.playSwish();
        this._wiperTween = this.tweens.add({
            targets:  t,
            v:        1,
            duration: CAR_CONFIG.WIPER_SWEEP_MS,
            ease:     'Sine.easeInOut',
            yoyo:     true,
            repeat:   CAR_CONFIG.WIPER_CYCLES - 1,
            onYoyo:   () => this.playSwish(),
            onRepeat: () => this.playSwish(),
            onUpdate: () => {
                const a = Phaser.Math.Linear(this._wiperDown, this._wiperUp, t.v);
                this._wipers.forEach(b => { b.rotation = a; });
            },
            onComplete: () => {
                this._wipers.forEach(b => { b.rotation = this._wiperDown; });
                this._wiping = false;
            },
        });
    }

    // ── Dashboard frame ──────────────────────────────────────────────────────

    buildDashboard() {
        const { W, H, dashTop } = this;
        if (this.textures.exists('car_dashboard')) {
            // Full-width frame anchored to the BOTTOM. The road/scenery is drawn
            // behind it (lower depth) and shows through the transparent
            // windscreen arch, blending into the open scenery above the frame.
            const img = this.add.image(W / 2, H, 'car_dashboard').setOrigin(0.5, 1).setDepth(10);
            img.setScale((W * CAR_CONFIG.DASH_WIDTH_FRAC) / img.width);   // proportional (uniform) scale
            return;
        }
        // Fallback drawn frame (placeholder until the art exists).
        const g = this.add.graphics().setDepth(10);
        g.fillStyle(0x2b2b3a, 1);
        g.fillRoundedRect(-40, dashTop - 6, W + 80, H - dashTop + 46,
            { tl: 90, tr: 90, bl: 0, br: 0 });
        g.fillStyle(0x1f1f2b, 1);
        g.fillRoundedRect(W * 0.30, dashTop + 20, W * 0.40, 54, 27);   // instrument cluster hint
    }

    // ── Steering wheel + horn ────────────────────────────────────────────────

    buildWheel() {
        const { W, H } = this;
        const R = W * 0.30;    // centered on the dashboard, leaving side margins for the stalks
        this._wheelR   = R;
        this._wheelMax = Phaser.Math.DegToRad(CAR_CONFIG.WHEEL_MAX_DEG);
        const cx = W / 2;
        const cy = H * 0.84;   // hub rests on the instrument panel; the wheel top rises into the windscreen
        this._wheelCx = cx;
        this._wheelCy = cy;

        // The rotating parts live in a container centred on the hub.
        const c = this.add.container(cx, cy).setDepth(12);

        // Wheel visual: the real art if present, else a drawn placeholder.
        let wheelVisual;
        if (this.textures.exists('car_steering_wheel')) {
            // The wheel fills ~77% of its 1024px image and sits ~39px below the
            // image centre; scale so the visible wheel is ≈2R and nudge it up so
            // the hub lands on the container origin (where the horn sits).
            const s = (2 * R * 1.30) / 1024;
            wheelVisual = this.add.image(0, -39 * s, 'car_steering_wheel').setScale(s);
        } else {
            wheelVisual = this.add.graphics();
            wheelVisual.lineStyle(34, 0x15151c, 1);
            wheelVisual.strokeCircle(0, 0, R);
            wheelVisual.lineStyle(10, 0x33333f, 1);
            wheelVisual.strokeCircle(0, 0, R - 20);
            wheelVisual.lineStyle(30, 0x15151c, 1);   // spokes: left, right, down
            [Math.PI, 0, Math.PI / 2].forEach(a => {
                wheelVisual.beginPath();
                wheelVisual.moveTo(0, 0);
                wheelVisual.lineTo(Math.cos(a) * (R - 10), Math.sin(a) * (R - 10));
                wheelVisual.strokePath();
            });
        }

        // Horn nested in the wheel's hub, raised a little so it sits higher on it.
        const hornR = R * 0.24;
        const hornY = -R * 0.10 - 4;
        const horn = this.add.circle(0, hornY, hornR, 0xd94b4b).setStrokeStyle(6, 0xa83232);
        horn.setInteractive({ useHandCursor: true });
        horn.on('pointerdown', (p, lx, ly, ev) => {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            this.playHorn();
            this.tweens.add({
                targets: horn, scale: 1.18, duration: 90, yoyo: true, ease: 'Quad.easeOut',
            });
        });
        const hornIcon = this.add.text(0, hornY, '🔊', { fontSize: `${hornR}px` }).setOrigin(0.5);

        c.add([wheelVisual, horn, hornIcon]);
        this.wheel = c;

        // Non-rotating drag zone over the whole wheel (a full circle, so its own
        // rotation doesn't matter). The horn sits above it and grabs centre taps.
        const hit = this.add.circle(cx, cy, R, 0xffffff, 0.001).setDepth(11);
        hit.setInteractive(new Phaser.Geom.Circle(R, R, R), Phaser.Geom.Circle.Contains);
        hit.on('pointerdown', (p) => {
            this._steer = { start: this.angleAt(p), rot0: this.wheel.rotation };
            if (this._returnTween) { this._returnTween.stop(); this._returnTween = null; }
        });
        this.input.on('pointermove', (p) => {
            if (!this._steer) return;
            const delta = Phaser.Math.Angle.Wrap(this.angleAt(p) - this._steer.start);
            this.wheel.rotation = Phaser.Math.Clamp(
                this._steer.rot0 + delta, -this._wheelMax, this._wheelMax);
            this.updateParallax();
        });
        this.input.on('pointerup', () => {
            if (!this._steer) return;
            this._steer = null;
            this._returnTween = this.tweens.add({
                targets:  this.wheel,
                rotation: 0,
                duration: CAR_CONFIG.WHEEL_RETURN_MS,
                ease:     'Back.easeOut',
                onUpdate: () => this.updateParallax(),
            });
        });
    }

    angleAt(pointer) {
        return Math.atan2(pointer.y - this._wheelCy, pointer.x - this._wheelCx);
    }

    // ── Indicator tell-tale lights (green arrows on the dash, behind the wheel) ─

    buildIndicatorLights() {
        const cx = this._wheelCx, cy = this._wheelCy, R = this._wheelR;
        const y  = cy - R * 0.55 + 3;  // up in the open area behind the wheel spokes
        const dx = R * 0.30;
        this._tellLeft  = this.makeTell(cx - dx, y, '◀');
        this._tellRight = this.makeTell(cx + dx, y, '▶');
    }

    makeTell(x, y, glyph) {
        // Dim when off; the matching one lights bright green + flashes while its
        // indicator is on. Depth 11 = behind the wheel (12), in front of the dash.
        return this.add.text(x, y, glyph, {
            fontFamily: 'Arial, sans-serif', fontSize: '46px', color: '#2f6b28',
        }).setOrigin(0.5).setAlpha(0.22).setDepth(11);
    }

    // side: 'left' | 'right'. Driven by the indicator stalk (up = right, down = left).
    setIndicator(side) {
        if (this._indicator === side) { this.stopIndicator(); return; }  // same way again = off
        this.stopIndicator();
        this._indicator = side;
        const tell = side === 'left' ? this._tellLeft : this._tellRight;
        this._indActiveTell = tell;
        tell.setColor('#37e04a');
        this._indGlow = this.tweens.add({
            targets: tell, alpha: { from: 1, to: 0.2 },
            duration: CAR_CONFIG.INDICATOR_TICK_MS / 2, yoyo: true, repeat: -1,
        });
        this.playTick();
        this._indTick = this.time.addEvent({
            delay: CAR_CONFIG.INDICATOR_TICK_MS, loop: true, callback: () => this.playTick(),
        });
        this._indTimeout = this.time.delayedCall(CAR_CONFIG.INDICATOR_TIMEOUT_MS,
            () => this.stopIndicator());
        this.syncIndicatorStalk();
    }

    stopIndicator() {
        if (this._indTick)    { this._indTick.remove();    this._indTick = null; }
        if (this._indTimeout) { this._indTimeout.remove(); this._indTimeout = null; }
        if (this._indGlow)    { this._indGlow.stop();      this._indGlow = null; }
        if (this._indActiveTell) {
            this._indActiveTell.setAlpha(0.22).setColor('#2f6b28');
            this._indActiveTell = null;
        }
        this._indicator = null;
        this.syncIndicatorStalk();
    }

    // ── Stalks (drag / flick up or down) ─────────────────────────────────────
    // Left stalk = wipers (push either way to sweep, springs back). Right stalk =
    // indicators (push up = right, down = left; stays until it turns off).

    buildStalks() {
        const cx = this._wheelCx, cy = this._wheelCy, R = this._wheelR;
        const y = cy - R * 0.12;                    // just above the hub, flanking the wheel
        this._stalkTilt = Phaser.Math.DegToRad(17);
        this._stalkLen  = R * 0.46;                 // short enough to stay on-screen in the margin
        this._wiperStalk = this.makeStalk(cx - (R - 4), y, -1, 'wiper', '💧');   // left, inner end just behind the rim
        this._indStalk   = this.makeStalk(cx + (R - 4), y, +1, 'indicator', '⇅'); // right, inner end just behind the rim

        // One shared drag for whichever stalk was grabbed.
        this.input.on('pointermove', p => {
            if (!this._activeStalk) return;
            const s  = this._activeStalk;
            const up = Phaser.Math.Clamp(-(p.y - s.startY) / 70, -1, 1);   // +1 up, -1 down
            s.c.rotation = -s.outSign * up * this._stalkTilt;
        });
        this.input.on('pointerup', p => {
            if (!this._activeStalk) return;
            const s = this._activeStalk; this._activeStalk = null;
            const dy = p.y - s.startY, TH = 22;
            if      (dy < -TH) this.stalkAction(s, 'up');
            else if (dy >  TH) this.stalkAction(s, 'down');
            else if (s.kind === 'indicator' && this._indicator) this.stopIndicator();  // a tap cancels
            else               this.settleStalk(s);
        });
    }

    makeStalk(pivotX, pivotY, outSign, kind, glyph) {
        const len = this._stalkLen, thick = 44;   // doubled for chunkier, easier-to-grab toggles
        const c = this.add.container(pivotX, pivotY).setDepth(11);
        const g = this.add.graphics();
        g.fillStyle(0x2a2d36, 1);
        g.fillRoundedRect(Math.min(0, outSign * len), -thick / 2, len, thick, thick / 2);
        const knob = this.add.circle(outSign * len, 0, thick * 0.95, 0x3a3f4a)
            .setStrokeStyle(3, 0x20242c);
        const icon = this.add.text(outSign * len, 0, glyph, { fontSize: `${Math.round(thick)}px` })
            .setOrigin(0.5);
        c.add([g, knob, icon]);

        const stalk = { c, outSign, kind, startY: 0 };

        // Hit zone over the visible OUTER part of the stalk, kept clear of the
        // wheel so it never steals a steering drag. Tall for the up/down flick.
        const zx = pivotX + outSign * len * 0.65;
        this.add.zone(zx, pivotY, len * 0.95, 150).setDepth(15)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', p => { this._activeStalk = stalk; stalk.startY = p.y; });
        return stalk;
    }

    // Rest/held rotation for a stalk given the current state.
    // Indicator stalk: push UP = left, DOWN = right.
    stalkRestRotation(s) {
        if (s.kind === 'wiper') return 0;
        if (this._indicator === 'left')  return -s.outSign * this._stalkTilt;  // up
        if (this._indicator === 'right') return  s.outSign * this._stalkTilt;  // down
        return 0;
    }

    settleStalk(s) {
        this.tweens.add({ targets: s.c, rotation: this.stalkRestRotation(s),
            duration: 200, ease: 'Back.easeOut' });
    }

    syncIndicatorStalk() {
        if (this._indStalk) this.settleStalk(this._indStalk);
    }

    stalkAction(s, dir) {
        if (s.kind === 'wiper') {
            this.startWipers();
            this.settleStalk(s);                                 // momentary — springs back
        } else {
            this.setIndicator(dir === 'up' ? 'left' : 'right');  // setIndicator settles the stalk
        }
    }

    // ── Exit menu (door button → menu of destinations) ───────────────────────

    buildExitButton() {
        const ZX = this.W - 50, ZY = 50;
        const dW = 36, dH = 50, dX = ZX - dW / 2, dY = ZY - dH / 2;
        const icon = this.add.graphics().setDepth(50);
        icon.fillStyle(0xFFFFFF, 0.18); icon.fillRoundedRect(dX, dY, dW, dH, 5);
        icon.lineStyle(2.5, 0xFFFFFF, 0.65); icon.strokeRoundedRect(dX, dY, dW, dH, 5);
        icon.fillStyle(0xFFFFFF, 0.8); icon.fillCircle(ZX - 8, ZY + 3, 3.5);
        this.add.zone(ZX, ZY, 100, 100).setDepth(51).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.openExitMenu());
    }

    openExitMenu() {
        if (this._menu) return;
        const { W, H } = this;
        const menu = this.add.container(0, 0).setDepth(100);

        const backdrop = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55)
            .setInteractive();
        backdrop.on('pointerdown', () => this.closeExitMenu());

        const panelW = W * 0.5, panelH = H * 0.62;
        const panel = this.add.graphics();
        panel.fillStyle(0xF2E4D4, 1);
        panel.fillRoundedRect(W / 2 - panelW / 2, H / 2 - panelH / 2, panelW, panelH, 28);

        const title = this.add.text(W / 2, H / 2 - panelH / 2 + 44, 'Where to?', {
            fontFamily: 'Quicksand, Arial, sans-serif', fontSize: '44px',
            color: '#5a4632', fontStyle: 'bold',
        }).setOrigin(0.5);

        menu.add([backdrop, panel, title]);

        const opts = [
            ['Main Game',        () => this.leaveTo('PlayScene', { fromMinigame: true })],
            ['Mini-Game Select', () => this.leaveTo('MiniGameSelectScene')],
            ['Character Select', () => this.leaveTo('SelectScene')],
        ];
        const bw = panelW * 0.82, bh = 78, gap = 22;
        const firstY = H / 2 - ((opts.length - 1) * (bh + gap)) / 2 + 20;
        opts.forEach(([label, fn], i) => {
            const y = firstY + i * (bh + gap);
            const bg = this.add.graphics();
            bg.fillStyle(0xE08D5A, 1);
            bg.fillRoundedRect(W / 2 - bw / 2, y - bh / 2, bw, bh, 20);
            const txt = this.add.text(W / 2, y, label, {
                fontFamily: 'Quicksand, Arial, sans-serif', fontSize: '34px',
                color: '#ffffff', fontStyle: 'bold',
            }).setOrigin(0.5);
            const z = this.add.zone(W / 2, y, bw, bh).setInteractive({ useHandCursor: true });
            z.on('pointerover', () => { bg.clear(); bg.fillStyle(0xd07a45, 1);
                bg.fillRoundedRect(W / 2 - bw / 2, y - bh / 2, bw, bh, 20); });
            z.on('pointerout',  () => { bg.clear(); bg.fillStyle(0xE08D5A, 1);
                bg.fillRoundedRect(W / 2 - bw / 2, y - bh / 2, bw, bh, 20); });
            z.on('pointerdown', fn);
            menu.add([bg, txt, z]);
        });

        this._menu = menu;
    }

    closeExitMenu() {
        if (this._menu) { this._menu.destroy(true); this._menu = null; }
    }

    leaveTo(sceneKey, extra) {
        this.closeExitMenu();
        this.scene.start(sceneKey, Object.assign({ characterId: this.characterId }, extra || {}));
    }

    // ── Audio (fire-and-forget; synth fallbacks; never locks input) ──────────

    _ctx() {
        const c = this.sound.context;
        return (c && c.state === 'running') ? c : null;
    }

    _tone(freq, dur, type, gain, sweepTo) {
        const ctx = this._ctx();
        if (!ctx) return;
        const now = ctx.currentTime;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(freq, now);
        if (sweepTo) o.frequency.exponentialRampToValueAtTime(sweepTo, now + dur);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(gain, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(now); o.stop(now + dur + 0.02);
    }

    playHorn() {
        if (this.sound.mute) return;
        if (this.cache.audio.exists('horn')) {
            if (this._hornSnd) this._hornSnd.stop();     // snappy on rapid presses
            this._hornSnd = this.sound.add('horn');
            this._hornSnd.play();
            return;
        }
        // Sustained two-tone "beeeep": quick attack, hold, then release — longer
        // and more horn-like than a short blip. Cut off any prior beep first.
        const ctx = this._ctx();
        if (!ctx) return;
        if (this._hornOscs) this._hornOscs.forEach(o => { try { o.stop(); } catch (e) {} });
        const now = ctx.currentTime, dur = 0.6;
        this._hornOscs = [];
        [392, 262].forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'square';
            o.frequency.setValueAtTime(f, now);
            const peak = i ? 0.14 : 0.16;
            g.gain.setValueAtTime(0.0001, now);
            g.gain.exponentialRampToValueAtTime(peak, now + 0.02);   // quick attack
            g.gain.setValueAtTime(peak, now + dur - 0.1);            // hold
            g.gain.exponentialRampToValueAtTime(0.0001, now + dur);  // release
            o.connect(g); g.connect(ctx.destination);
            o.start(now); o.stop(now + dur + 0.02);
            this._hornOscs.push(o);
        });
    }

    playSwish() {
        if (this.sound.mute) return;
        if (this.cache.audio.exists('wiper_swish')) { this.sound.play('wiper_swish', { volume: 0.5 }); return; }
        this._swish();
    }

    // Synth "swish": a short band-pass-filtered white-noise burst that swells
    // then fades, with the filter sweeping up-then-down like the blade
    // travelling across the glass — reads as an airy "swish" rather than a tone.
    _swish() {
        const ctx = this._ctx();
        if (!ctx) return;
        const now = ctx.currentTime, dur = 0.3;
        const buf  = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;   // white noise
        const src = ctx.createBufferSource();
        src.buffer = buf;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 0.8;                                              // broad = airy whoosh
        bp.frequency.setValueAtTime(500, now);
        bp.frequency.linearRampToValueAtTime(1700, now + dur * 0.5);   // sweep up...
        bp.frequency.linearRampToValueAtTime(600, now + dur);          // ...then back down
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.14, now + dur * 0.35);        // quick swell
        g.gain.exponentialRampToValueAtTime(0.0001, now + dur);        // fade
        src.connect(bp); bp.connect(g); g.connect(ctx.destination);
        src.start(now); src.stop(now + dur);
    }

    playTick() {
        if (this.sound.mute) return;
        if (this.cache.audio.exists('indicator_tick')) { this.sound.play('indicator_tick'); return; }
        this._tone(1500, 0.035, 'square', 0.12);
    }

    // ── Teardown: stop loops/sounds ──────────────────────────────────────────

    teardown() {
        this.stopIndicator();
        if (this._engine) { this._engine.stop(); this._engine.destroy(); this._engine = null; }
        if (this._hornSnd) { this._hornSnd.stop(); this._hornSnd = null; }
    }
}
