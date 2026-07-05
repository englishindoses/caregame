// Little Driver — a pretend-driving toy for 3-year-olds. First-person view from
// the driver's seat: windscreen on top, dashboard + steering wheel below. No
// fail states, no scoring — the child steers, honks, wipes and indicates.
//
// This is the only LANDSCAPE scene: on entry it flips the game to 1280×720 and
// tries to lock orientation; on exit it restores the portrait size. A rotate
// prompt covers the screen while the phone is held portrait.
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
        // ── Go landscape for this scene only ─────────────────────────────────
        this.scale.setGameSize(1280, 720);
        try {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(() => {});
            }
        } catch (e) { /* iOS Safari: no lock — the rotate prompt covers this */ }

        const W = this.scale.width;
        const H = this.scale.height;
        this.W = W;
        this.H = H;

        // Key vertical bands.
        this.horizon = H * 0.32;
        this.dashTop = H * 0.56;

        this.layers   = [];      // parallax scenery {g, factor}
        this._steer   = null;    // active wheel-drag state
        this._wiping  = false;
        this._indicator    = null;   // null | 'left' | 'right'
        this._indActiveBtn = null;
        this._indTick = this._indTimeout = this._indGlow = null;

        this.buildScenery();
        this.buildWipers();
        this.buildDashboard();
        this.buildWheel();
        this.buildIndicators();
        this.buildWiperButton();
        this.buildExitButton();
        this.buildRotatePrompt();

        // Soft engine hum if the clip exists (no synth fallback — silence is fine).
        if (this.cache.audio.exists('engine_hum')) {
            this._engine = this.sound.add('engine_hum', { loop: true, volume: 0.15 });
            if (!this.sound.locked) this._engine.play();
            else this.sound.once('unlocked', () => this._engine && this._engine.play());
        }

        // Cleanly undo the landscape flip and stop loops on the way out.
        this.events.once('shutdown', () => this.teardown());
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
        // A couple of roadside bushes for the nearest parallax layer.
        grass.fillStyle(0x5f9e46, 1);
        grass.fillCircle(W * 0.08, dashTop - 20, 60);
        grass.fillCircle(W * 0.93, dashTop - 30, 72);
        this.layers.push({ g: grass, factor: 0.9 });

        // Road (trapezoid) + centre dashes.
        const road = this.add.graphics().setDepth(4);
        road.fillStyle(0x555560, 1);
        road.fillPoints([
            new Phaser.Geom.Point(W / 2 - 30, horizon),
            new Phaser.Geom.Point(W / 2 + 30, horizon),
            new Phaser.Geom.Point(W * 0.90, dashTop),
            new Phaser.Geom.Point(W * 0.10, dashTop),
        ], true);
        road.fillStyle(0xf2e4c4, 1);
        for (let i = 0; i <= 4; i++) {
            const t = i / 4;
            const y = Phaser.Math.Linear(horizon + 12, dashTop - 12, t);
            const w = Phaser.Math.Linear(4, 22, t);
            const h = Phaser.Math.Linear(8, 40, t);
            road.fillRect(W / 2 - w / 2, y - h / 2, w, h);
        }
        this.layers.push({ g: road, factor: 1.0 });
    }

    updateParallax() {
        const ratio = this.wheel ? this.wheel.rotation / this._wheelMax : 0;
        this.layers.forEach(l => {
            l.g.x = -ratio * CAR_CONFIG.PARALLAX_MAX_PX * l.factor;
        });
    }

    // ── Wipers (code-drawn, no image) ────────────────────────────────────────

    buildWipers() {
        const { W, dashTop } = this;
        const len = dashTop * 0.82;
        this._wiperRest  = Phaser.Math.DegToRad(22);    // leaning right at rest
        this._wiperSwept = Phaser.Math.DegToRad(-74);   // leaning left, swept

        const blade = (px) => {
            const r = this.add.rectangle(px, dashTop, 9, len, 0x20242c)
                .setOrigin(0.5, 1).setDepth(8);
            r.rotation = this._wiperRest;
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
                const a = Phaser.Math.Linear(this._wiperRest, this._wiperSwept, t.v);
                this._wipers.forEach(b => { b.rotation = a; });
            },
            onComplete: () => {
                this._wipers.forEach(b => { b.rotation = this._wiperRest; });
                this._wiping = false;
            },
        });
    }

    // ── Dashboard frame ──────────────────────────────────────────────────────

    buildDashboard() {
        const { W, H, dashTop } = this;
        if (this.textures.exists('car_dashboard')) {
            // Full-bleed frame anchored to the top so its transparent windscreen
            // opening lines up with the road view drawn behind it.
            const img = this.add.image(W / 2, 0, 'car_dashboard').setOrigin(0.5, 0).setDepth(10);
            img.setScale(W / img.width);
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
        const R = H * 0.34;
        this._wheelR   = R;
        this._wheelMax = Phaser.Math.DegToRad(CAR_CONFIG.WHEEL_MAX_DEG);
        const cx = W / 2;
        const cy = H * 0.78;   // hub sits on the dashboard; the bottom of the wheel runs off-screen
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

        // Horn nested in the wheel's hub.
        const hornR = R * 0.24;
        const horn = this.add.circle(0, 0, hornR, 0xd94b4b).setStrokeStyle(6, 0xa83232);
        horn.setInteractive({ useHandCursor: true });
        horn.on('pointerdown', (p, lx, ly, ev) => {
            if (ev && ev.stopPropagation) ev.stopPropagation();
            this.playHorn();
            this.tweens.add({
                targets: horn, scale: 1.18, duration: 90, yoyo: true, ease: 'Quad.easeOut',
            });
        });
        const hornIcon = this.add.text(0, 0, '🔊', { fontSize: `${hornR}px` }).setOrigin(0.5);

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

    // ── Indicators ───────────────────────────────────────────────────────────

    buildIndicators() {
        const { W, H } = this;
        const y = H * 0.72;
        this._indLeft  = this.makeIndicator(W * 0.11, y, 'left');
        this._indRight = this.makeIndicator(W * 0.89, y, 'right');
    }

    makeIndicator(x, y, side) {
        const bw = 96, bh = 96;
        const g = this.add.graphics().setDepth(12);
        g.fillStyle(0x1b1b26, 1);
        g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 18);
        const arrow = this.add.text(x, y, side === 'left' ? '◀' : '▶', {
            fontFamily: 'Arial, sans-serif', fontSize: '52px', color: '#3a7d2c',
        }).setOrigin(0.5).setDepth(13);
        const zone = this.add.zone(x, y, bw, bh).setDepth(14).setInteractive({ useHandCursor: true });
        zone.on('pointerdown', () => this.setIndicator(side));
        return { arrow, on: false };
    }

    setIndicator(side) {
        const btn = side === 'left' ? this._indLeft : this._indRight;
        if (this._indicator === side) { this.stopIndicator(); return; }   // tap again = off
        this.stopIndicator();
        this._indicator = side;
        this._indActiveBtn = btn;
        this._indGlow = this.tweens.add({
            targets: btn.arrow, alpha: { from: 1, to: 0.15 },
            duration: CAR_CONFIG.INDICATOR_TICK_MS / 2, yoyo: true, repeat: -1,
        });
        btn.arrow.setColor('#37e04a');
        this.playTick();
        this._indTick = this.time.addEvent({
            delay: CAR_CONFIG.INDICATOR_TICK_MS, loop: true, callback: () => this.playTick(),
        });
        this._indTimeout = this.time.delayedCall(CAR_CONFIG.INDICATOR_TIMEOUT_MS,
            () => this.stopIndicator());
    }

    stopIndicator() {
        if (this._indTick)    { this._indTick.remove();    this._indTick = null; }
        if (this._indTimeout) { this._indTimeout.remove(); this._indTimeout = null; }
        if (this._indGlow)    { this._indGlow.stop();      this._indGlow = null; }
        if (this._indActiveBtn) {
            this._indActiveBtn.arrow.setAlpha(1).setColor('#3a7d2c');
            this._indActiveBtn = null;
        }
        this._indicator = null;
    }

    // ── Wiper button ─────────────────────────────────────────────────────────

    buildWiperButton() {
        const { W, H } = this;
        const x = W * 0.30, y = H * 0.90, s = 78;
        const g = this.add.graphics().setDepth(12);
        g.fillStyle(0x1b1b26, 1);
        g.fillRoundedRect(x - s / 2, y - s / 2, s, s, 16);
        this.add.text(x, y, '🌧', { fontSize: '40px' }).setOrigin(0.5).setDepth(13);
        this.add.zone(x, y, s, s).setDepth(14).setInteractive({ useHandCursor: true })
            .on('pointerdown', () => this.startWipers());
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

    // ── Rotate prompt (shown while held portrait) ────────────────────────────

    buildRotatePrompt() {
        const { W, H } = this;
        const c = this.add.container(0, 0).setDepth(200).setVisible(false);
        const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x1b2a33, 0.97).setInteractive();
        const txt = this.add.text(W / 2, H / 2, '↻\n\nTurn your phone sideways', {
            fontFamily: 'Quicksand, Arial, sans-serif', fontSize: '54px',
            color: '#ffffff', align: 'center', lineSpacing: 10,
        }).setOrigin(0.5);
        c.add([bg, txt]);
        this._rotatePrompt = c;

        this._onResize = () => this.updateOrientation();
        window.addEventListener('resize', this._onResize);
        window.addEventListener('orientationchange', this._onResize);
        this.updateOrientation();
    }

    updateOrientation() {
        if (!this._rotatePrompt) return;
        const portrait = window.innerHeight > window.innerWidth;
        this._rotatePrompt.setVisible(portrait);
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
        this._tone(392, 0.28, 'square', 0.18);
        this._tone(262, 0.28, 'square', 0.16);
    }

    playSwish() {
        if (this.sound.mute) return;
        if (this.cache.audio.exists('wiper_swish')) { this.sound.play('wiper_swish', { volume: 0.5 }); return; }
        this._tone(760, 0.22, 'sine', 0.07, 220);
    }

    playTick() {
        if (this.sound.mute) return;
        if (this.cache.audio.exists('indicator_tick')) { this.sound.play('indicator_tick'); return; }
        this._tone(1500, 0.035, 'square', 0.12);
    }

    // ── Teardown: restore portrait, unlock orientation, stop loops ───────────

    teardown() {
        this.stopIndicator();
        if (this._engine) { this._engine.stop(); this._engine.destroy(); this._engine = null; }
        if (this._hornSnd) { this._hornSnd.stop(); this._hornSnd = null; }
        if (this._onResize) {
            window.removeEventListener('resize', this._onResize);
            window.removeEventListener('orientationchange', this._onResize);
            this._onResize = null;
        }
        try {
            if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
        } catch (e) { /* ignore */ }
        this.scale.setGameSize(720, 1280);
    }
}
