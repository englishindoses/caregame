// Catch mini-game — the child and the character take turns throwing a ball.
// No failure states: weak/sideways throws just bounce around the room and the
// child tries again. After 5 catches the character tires and we return to the
// main game. Audio is optional — missing clips simply no-op and the beats run
// on timers instead.
class CatchScene extends Phaser.Scene {
    constructor() {
        super('CatchScene');
    }

    init(data) {
        this.characterId = data.characterId || localStorage.getItem('tcm_character') || 'dolly';
        this.sound.mute  = localStorage.getItem('tcm_mute') === '1';
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.W = W;
        this.H = H;

        // ── Tunables (reference resolution) ──────────────────────────────────
        this.TARGET_CATCHES = 5;       // back-and-forths before the character tires
        this.CATCH_RADIUS   = 150;     // how close the ball must pass the character
        this.UP_SPEED       = 850;     // gentle lob velocity for a near-still release
        this.DRAG           = 300;     // deceleration so a throw rests in ~2–3s

        this.charX     = W / 2;
        this.charY     = H * 0.40;   // a little lower so the character rests on the room floor, not floating
        this.FLOOR_Y   = H * 0.80;   // rug line — where the ball rests (tweak to match the background)
        this.ballStart = { x: W / 2, y: this.FLOOR_Y };
        this.playerY   = this.FLOOR_Y;  // the character throws the ball back down to the rug

        this.catchCount = 0;
        this.phase      = 'opening';   // opening | idle | flying | settling | held | throwBack | ended
        this._drag      = null;

        this.setupAudioQueue();

        // Same bedroom background as the main game.
        if (this.textures.exists('bg_room')) {
            this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0xF2E4D4);
        }

        // Character in the upper-centre, smaller than in the main game so they
        // read as standing a little further back across the room.
        const charKey = `${this.characterId}_happy`;
        this.charSprite = this.add.image(this.charX, this.charY, charKey);
        if (this.textures.exists(charKey)) {
            const maxDim = Math.min(W * 0.40, H * 0.23);
            this.charScale = maxDim / Math.max(this.charSprite.width, this.charSprite.height);
            this.charSprite.setScale(this.charScale);
        }
        this.charSprite.setDepth(5);

        // Soft shadow on the rug; it fades as the ball lifts off the floor.
        this.ballShadow = this.add.ellipse(this.ballStart.x, this.FLOOR_Y + H * 0.03,
            W * 0.16, H * 0.02, 0x000000, 0.18).setDepth(3);

        // Ball with circular physics body.
        this.ball = this.physics.add.image(this.ballStart.x, this.ballStart.y, 'item_ball').setDepth(6);
        const BALL_SIZE = W * 0.22;
        this.ballScale = BALL_SIZE / Math.max(this.ball.width, this.ball.height);
        this.ball.setScale(this.ballScale);
        const r = Math.min(this.ball.width, this.ball.height) / 2;
        this.ball.body.setCircle(r, (this.ball.width - 2 * r) / 2, (this.ball.height - 2 * r) / 2);
        this.ball.setCollideWorldBounds(true);
        this.ball.setBounce(0.7, 0.7);
        this.ball.setDrag(this.DRAG, this.DRAG);
        this.ball.body.onWorldBounds = true;

        // Confine the ball to the room above the rug — it can bounce off the
        // floor line and rest on it, but never sink below into the furniture.
        this.physics.world.setBounds(0, 0, W, this.FLOOR_Y + this.ball.displayHeight / 2);

        // Boing on every wall bounce (silent until boing.mp3 is added).
        this.physics.world.on('worldbounds', body => {
            if (body.gameObject === this.ball) this.playBoing();
        });

        // Throw input — drag the ball with the cursor/finger and release. The
        // release direction and speed become the throw, so a sideways flick
        // sends it bouncing off the walls.
        this.ball.setInteractive();
        this.ball.on('pointerdown', pointer => {
            if (!this.canThrow() || this._drag) return;
            this._drag = { points: [{ x: pointer.x, y: pointer.y, t: this.time.now }] };
            this.ball.body.enable = false;        // ball follows the finger while dragging
            this.ball.setVelocity(0, 0);
            this.ball.setAngularVelocity(0);
            this.ball.setAngle(0);
        });
        this.input.on('pointermove', pointer => {
            if (!this._drag) return;
            this.ball.setPosition(pointer.x, pointer.y);
            const pts = this._drag.points;
            pts.push({ x: pointer.x, y: pointer.y, t: this.time.now });
            // Keep only the last ~120ms of movement to derive the release velocity.
            while (pts.length > 2 && pts[pts.length - 1].t - pts[0].t > 120) pts.shift();
        });
        this.input.on('pointerup', () => {
            if (!this._drag) return;
            const pts = this._drag.points;
            this._drag = null;
            this.ball.body.enable = true;
            this.releaseThrow(pts);
        });

        // Short silent opening beat so the ball isn't live the instant the scene
        // appears (the "let's play catch!" line was already spoken on the select
        // screen). Then the child can throw.
        this.time.delayedCall(700, () => { if (this.phase === 'opening') this.phase = 'idle'; });
    }

    canThrow() {
        return this.phase === 'idle' && !this._inputLocked;
    }

    // ── Throwing ─────────────────────────────────────────────────────────────

    releaseThrow(points) {
        const last  = points[points.length - 1];
        const first = points[0];
        const dt    = Math.max((last.t - first.t) / 1000, 0.016);
        let vx = (last.x - first.x) / dt;
        let vy = (last.y - first.y) / dt;
        let speed = Math.hypot(vx, vy);

        if (speed < 150) {
            // Released almost still — give a gentle lob up toward the character
            // so even a small drag does something nice.
            this.ball.setVelocity(Phaser.Math.Between(-60, 60), -this.UP_SPEED);
            this.ball.setAngularVelocity(300);
        } else {
            const MAX = 1400;
            if (speed > MAX) { vx *= MAX / speed; vy *= MAX / speed; speed = MAX; }
            this.ball.setVelocity(vx, vy);
            this.ball.setAngularVelocity(Phaser.Math.Clamp(speed * 0.4, 200, 600) * (vx < 0 ? -1 : 1));
        }
        this.phase = 'flying';
    }

    // ── Per-frame catch / rest detection ──────────────────────────────────────

    update() {
        // Shadow tracks the ball horizontally, fading as it lifts off the floor.
        if (this.ballShadow) {
            this.ballShadow.x = this.ball.x;
            const lift = Phaser.Math.Clamp((this.FLOOR_Y - this.ball.y) / (this.H * 0.4), 0, 1);
            this.ballShadow.setAlpha(0.18 * (1 - lift));
            this.ballShadow.setScale(1 - lift * 0.4);
        }

        if (this.phase !== 'flying') return;

        const speed = this.ball.body.velocity.length();
        const dist  = Phaser.Math.Distance.Between(this.ball.x, this.ball.y, this.charX, this.charY);

        if (dist < this.CATCH_RADIUS && speed > 40) {
            this.characterCatch();
        } else if (speed < 8) {
            // Throw has run out of energy — let it drop and settle on the rug.
            this.settleToFloor();
        }
    }

    // Gently drop the ball to the rug so it never freezes floating in mid-air,
    // then hand control back to the child. (Option B: no gravity during flight,
    // just a settle on rest — keeps throws forgiving for a toddler.)
    settleToFloor() {
        this.phase = 'settling';
        this.ball.setVelocity(0, 0);
        this.ball.setAngularVelocity(0);
        this.ball.body.enable = false;
        this.tweens.add({
            targets:  this.ball,
            y:        this.FLOOR_Y,
            duration: 350,
            ease:     'Quad.easeIn',   // accelerating drop, like a little fall
            onComplete: () => {
                this.ball.body.enable = true;
                this.ball.setVelocity(0, 0);
                this.phase = 'idle';
            },
        });
    }

    // ── Character catches ─────────────────────────────────────────────────────

    characterCatch() {
        this.phase = 'held';
        this.ball.setVelocity(0, 0);
        this.ball.setAngularVelocity(0);
        this.ball.body.enable = false;                 // hand-off — physics off while held/thrown back
        this.ball.setAngle(0);
        this.ball.setPosition(this.charX, this.charY + this.charSprite.displayHeight * 0.15);

        this.setCharEmotion('jumping');
        this.pulse(this.charSprite);

        if (this.catchCount >= this.TARGET_CATCHES) {
            this.endGame();
            return;
        }

        // Use the existing "thank you for the toy" line when the character
        // catches (a real recorded clip), falling back to any catch-specific
        // clips once those are recorded.
        this.queueAudio('thank_you_toys_1');
        // Hold briefly, then throw it back regardless of whether audio played.
        this.queueThen(() => this.time.delayedCall(800, () => this.throwBack()));
    }

    throwBack() {
        this.phase = 'throwBack';
        const targetX = this.W / 2;
        const targetY = this.playerY;
        const spin    = { a: this.ball.angle };

        this.tweens.add({
            targets:  this.ball,
            x:        targetX,
            y:        targetY,
            duration: 700,
            ease:     'Quad.easeOut',
            onComplete: () => this.playerCatch(),
        });
        // Spin during the throw-back (body is disabled, so rotate by tween).
        this.tweens.add({
            targets:  spin,
            a:        this.ball.angle + 360,
            duration: 700,
            ease:     'Linear',
            onUpdate: () => this.ball.setAngle(spin.a),
        });
    }

    // ── Child catches ─────────────────────────────────────────────────────────

    playerCatch() {
        this.catchCount++;
        this.setCharEmotion('happy');
        this.pulse(this.ball);

        this.queueAudio(Phaser.Utils.Array.GetRandom(PHRASES.playerCatch));
        this.queueThen(() => this.time.delayedCall(600, () => {
            // Ready for the next throw: re-enable physics, settle on the floor.
            this.ball.body.enable = true;
            this.ball.setVelocity(0, 0);
            this.ball.setAngularVelocity(0);
            this.phase = 'idle';
        }));
    }

    // ── End: character tires, return to the main game ─────────────────────────

    endGame() {
        this.phase = 'ended';
        this.setCharEmotion('sleepy');
        this.queueAudio(Phaser.Utils.Array.GetRandom(PHRASES.playTired));
        this.queueThen(() => this.time.delayedCall(900, () => {
            this.scene.start('PlayScene', { characterId: this.characterId, fromMinigame: true });
        }));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    setCharEmotion(emotion) {
        let key = `${this.characterId}_${emotion}`;
        if (!this.textures.exists(key)) key = `${this.characterId}_happy`;
        if (this.textures.exists(key)) {
            this.charSprite.setTexture(key);
            if (this.charScale) this.charSprite.setScale(this.charScale);
        }
    }

    pulse(target) {
        const sx = target.scaleX || 1;
        const sy = target.scaleY || 1;
        this.tweens.add({
            targets:  target,
            scaleX:   sx * 1.2,
            scaleY:   sy * 1.2,
            duration: 140,
            yoyo:     true,
            ease:     'Back.easeOut',
            onComplete: () => target.setScale(sx, sy),
        });
    }

    playBoing() {
        // Fire-and-forget SFX — never queued, never locks input.
        if (this.sound.mute) return;
        if (this.cache.audio.exists('boing')) { this.sound.play('boing'); return; }

        // No boing.mp3 yet — synthesize a soft "doink": a sine tone whose pitch
        // drops quickly with a fast fade-out. Swap for the recorded clip later.
        const ctx = this.sound.context;
        if (!ctx || ctx.state !== 'running') return;
        const now  = ctx.currentTime;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.18);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.24);
    }

    // ── Audio queue (same two-tier pattern as PlayScene) ─────────────────────

    setupAudioQueue() {
        this._queue        = [];
        this._busy         = false;
        this._inputLocked  = false;
        this._currentSound = null;

        if (this.sound.locked) {
            this.sound.once('unlocked', () => this._nextAudio());
        }

        this.events.once('shutdown', () => {
            this._queue       = [];
            this._busy        = false;
            this._inputLocked = false;
            if (this._currentSound) {
                this._currentSound.stop();
                this._currentSound.destroy();
                this._currentSound = null;
            }
        });
    }

    queueAudio(key) {
        if (!key || !this.cache.audio.exists(key)) return;
        this._queue.push(key);
        if (!this._busy && !this.sound.locked) this._nextAudio();
    }

    queueThen(fn) {
        this._queue.push(fn);
        if (!this._busy && !this.sound.locked) this._nextAudio();
    }

    _nextAudio() {
        if (this._queue.length === 0) { this._busy = false; this._inputLocked = false; return; }
        this._busy = true;
        const item = this._queue.shift();
        if (typeof item === 'function') {
            this._busy = false;
            item();
            if (!this._busy) this._nextAudio();
            return;
        }
        this._inputLocked = true;
        const snd = this.sound.add(item);
        this._currentSound = snd;
        snd.once('complete', () => {
            snd.destroy();
            this._currentSound = null;
            this._nextAudio();
        });
        snd.play();
    }
}
