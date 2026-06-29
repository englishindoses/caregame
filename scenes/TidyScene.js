// Tidy Time mini-game — the child drags every toy into the toy box.
// No fail state: a toy dropped anywhere but the box simply rests where it's
// left (the floor is most of the screen) and stays draggable. Voice lines
// interrupt each other (never queue) so a briskly-tidying toddler is never
// kept waiting. Audio is optional — missing clips no-op and beats run on
// timers / the synthesized plop.
class TidyScene extends Phaser.Scene {
    constructor() {
        super('TidyScene');
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

        // The 5 play-category toys, with the id used for the naming audio.
        this.toyDefs = [
            { img: 'item_book',   id: 'book'   },
            { img: 'item_ball',   id: 'ball'   },
            { img: 'item_blocks', id: 'blocks' },
            { img: 'item_car',    id: 'car'    },
            { img: 'item_teddy',  id: 'teddy'  },
        ];

        // Layout (reference resolution). In bg_room the back wall meets the floor
        // at ~50% of screen height; the round rug spans ~52–81% and the open
        // foreground floor is ~80–100%. Everything here sits on the floor so
        // nothing floats up on the wall.
        this.charX       = W / 2;
        this.charY       = H * 0.40;   // exact same spot as the Catch mini-game
        this.boxX        = W / 2;
        this.boxY        = H * 0.84;   // toy box on the open foreground floor
        this.BOX_SIZE    = W * 0.50;
        this.BOX_RADIUS  = Math.max(155, this.BOX_SIZE * 0.55);  // generous, but clear of resting toys
        // RUG_TOP is set from the character's feet once the sprite exists (see below).
        this.RUG_BOTTOM  = H * 0.63;   // raised bottom edge of the toy zone — toys rest above this
        this.FLOOR_Y     = H * 0.74;   // world-floor safety net just below the rug

        // Live perspective: a toy's size depends on its current Y — higher on the
        // screen (further away) is smaller, lower (nearer the player) is bigger.
        this.PERSP_FAR_Y  = H * 0.45;
        this.PERSP_NEAR_Y = H * 0.92;
        this.PERSP_MIN    = 0.70;
        this.PERSP_MAX    = 1.30;
        this.TOY_TARGET  = W * 0.24;

        this.remaining = this.toyDefs.length;
        this._ending   = false;
        this._voice    = null;

        this._dragLocked   = false;   // gate toy dragging during a name reveal / the finale
        this._revealActive = false;   // a dropped toy's name is on screen, waiting for a tap

        this._dropNum = 0;
        // "in it goes" (before the name) and "what about that one?" (after it) each
        // play on only 2–3 of the four non-final drops — not every time.
        this._beforeDrops = new Set(Phaser.Utils.Array.Shuffle([1, 2, 3, 4]).slice(0, Phaser.Math.Between(2, 3)));
        this._afterDrops  = new Set(Phaser.Utils.Array.Shuffle([1, 2, 3, 4]).slice(0, Phaser.Math.Between(2, 3)));

        // Toys fall under gravity and rest on the floor at rug level. Open the
        // top of the world so they can rain in from above the screen.
        this.physics.world.setBounds(0, 0, W, this.FLOOR_Y);
        this.physics.world.gravity.y = 900;
        this.physics.world.checkCollision.up = false;

        // Background.
        if (this.textures.exists('bg_room')) {
            this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0xF2E4D4);
        }

        this.makeStarTexture();
        this.buildCharacter();

        // Toys scatter from the character's feet down to the (raised) rug edge.
        this.charFeetY = this.charSprite.y + this.charSprite.displayHeight / 2;
        this.RUG_TOP   = this.charFeetY;

        this.buildBox();
        this.buildNameText();
        this.spawnToys();
        this.setupDrag();
        addDoorButton(this);   // hold-to-exit, same as the main game

        // In-scene opening, while the toys drop in (tidy_chosen_2 / _3, cycled).
        this.playVoice(PHRASES.nextTidyOpening());
    }

    update() {
        if (!this.toys) return;
        for (const toy of this.toys) {
            if (!toy.active || !toy.body || !toy.body.enable) continue;  // dragged toys are sized by the drag handler
            // Stop each falling toy at its own rug level so they scatter across
            // the rug instead of piling onto one floor line.
            if (!toy.landed && toy.body.velocity.y >= 0 && toy.y >= toy.restY) {
                toy.y = toy.restY;
                toy.setVelocity(0, 0);
                toy.body.setAllowGravity(false);
                toy.landed = true;
            }
            this.applyPerspective(toy);   // grows as it descends; constant once at rest
        }
    }

    // Size a toy from its current Y: smaller up high (far), bigger low down (near).
    perspFactor(y) {
        const t = Phaser.Math.Clamp((y - this.PERSP_FAR_Y) / (this.PERSP_NEAR_Y - this.PERSP_FAR_Y), 0, 1);
        return Phaser.Math.Linear(this.PERSP_MIN, this.PERSP_MAX, t);
    }

    applyPerspective(toy, extra = 1) {
        toy.setScale(toy.unitScale * this.perspFactor(toy.y) * extra);
    }

    // ── Character ─────────────────────────────────────────────────────────────

    buildCharacter() {
        // Match the Catch mini-game exactly: same position, same size, stationary
        // (no idle bounce).
        const key = `${this.characterId}_happy`;
        this.charSprite = this.add.image(this.charX, this.charY, key).setDepth(5);
        if (this.textures.exists(key)) {
            const maxDim = Math.min(this.W * 0.46, this.H * 0.27);
            this.charScale = maxDim / Math.max(this.charSprite.width, this.charSprite.height);
            this.charSprite.setScale(this.charScale);
        }
    }

    setCharEmotion(emotion) {
        let key = `${this.characterId}_${emotion}`;
        if (!this.textures.exists(key)) key = `${this.characterId}_happy`;
        if (this.textures.exists(key)) {
            this.charSprite.setTexture(key);
            if (this.charScale) this.charSprite.setScale(this.charScale);
        }
    }

    pulse(target, factor = 1.2) {
        const sx = target.scaleX || 1;
        const sy = target.scaleY || 1;
        this.tweens.add({
            targets:  target,
            scaleX:   sx * factor,
            scaleY:   sy * factor,
            duration: 150,
            yoyo:     true,
            ease:     'Back.easeOut',
            onComplete: () => target.setScale(sx, sy),
        });
    }

    // ── Toy box ───────────────────────────────────────────────────────────────

    buildBox() {
        const startY = this.H + this.BOX_SIZE;   // off-screen below; slides up
        this.boxClosedKey = 'toy_box_closed';
        this.boxOpenKey   = 'toy_box_open';

        // Soft glow behind the box; brightens when a dragged toy is over it.
        this.boxGlow = this.add.rectangle(this.boxX, this.boxY,
            this.BOX_SIZE * 1.15, this.BOX_SIZE * 0.95, 0xFFF1A8, 0).setDepth(4);

        if (this.textures.exists(this.boxClosedKey)) {
            this.boxObj = this.add.image(this.boxX, startY, this.boxClosedKey).setDepth(6);
            this.boxBase = this.BOX_SIZE / Math.max(this.boxObj.width, this.boxObj.height);
            this.boxObj.setScale(this.boxBase);
        } else {
            // Placeholder coloured box until the real toy-box art exists.
            this.boxObj = this.add.rectangle(this.boxX, startY,
                this.BOX_SIZE, this.BOX_SIZE * 0.8, 0xC79A5B).setDepth(6);
            this.boxObj.setStrokeStyle(5, 0x8A6A3A, 1);
            this.boxBase = 1;
            this.boxLabel = this.add.text(this.boxX, startY, 'Toy Box', {
                fontFamily: '"Quicksand", Arial, sans-serif',
                fontSize:   '40px',
                color:      '#ffffff',
                stroke:     '#000000',
                strokeThickness: 5,
            }).setOrigin(0.5).setDepth(7);
        }

        // Slide up into place, then open the lid and start the subtle idle pulse.
        this.tweens.add({
            targets:  this.boxLabel ? [this.boxObj, this.boxLabel] : this.boxObj,
            y:        this.boxY,
            duration: 500,
            ease:     'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(250, () => this.openBox());
                this.tweens.add({
                    targets:  this.boxObj,
                    scaleX:   this.boxBase * 1.02,
                    scaleY:   this.boxBase * 1.02,
                    duration: 2000,
                    yoyo:     true,
                    repeat:   -1,
                    ease:     'Sine.easeInOut',
                });
            },
        });
    }

    setBoxTexture(key) {
        // Swap closed/open art if the box is a real image (placeholder is a rect).
        if (this.boxObj && this.boxObj.setTexture && this.textures.exists(key)) {
            this.boxObj.setTexture(key);
        }
    }

    openBox()  { this.setBoxTexture(this.boxOpenKey); }
    closeBox() { this.setBoxTexture(this.boxClosedKey); }

    // ── Celebration: star explosion ───────────────────────────────────────────

    makeStarTexture() {
        if (this.textures.exists('star_particle')) return;
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xffffff, 1);
        g.fillPoints(this.starPoints(32, 32, 5, 30, 13), true);
        g.generateTexture('star_particle', 64, 64);
        g.destroy();
    }

    starPoints(cx, cy, spikes, outerR, innerR) {
        const pts = [];
        let rot = -Math.PI / 2;
        const step = Math.PI / spikes;
        for (let i = 0; i < spikes; i++) {
            pts.push({ x: cx + Math.cos(rot) * outerR, y: cy + Math.sin(rot) * outerR }); rot += step;
            pts.push({ x: cx + Math.cos(rot) * innerR, y: cy + Math.sin(rot) * innerR }); rot += step;
        }
        return pts;
    }

    starBurst() {
        const colors = [0xFFD83D, 0xFF6B9D, 0x6BC5FF, 0x8AE26B, 0xC79AFF, 0xFFFFFF];
        const emitter = this.add.particles(this.boxX, this.boxY - this.BOX_SIZE * 0.2, 'star_particle', {
            speed:    { min: 250, max: 680 },
            angle:    { min: 0, max: 360 },
            gravityY: 650,
            lifespan: 1200,
            scale:    { start: 1.5, end: 0 },
            rotate:   { min: 0, max: 360 },
            tint:     colors,
            emitting: false,
        }).setDepth(25);
        emitter.explode(40);
        this.time.delayedCall(1600, () => emitter.destroy());
    }

    playCelebrate() {
        if (this.sound.mute) return;
        if (this.cache.audio.exists('celebrate')) { this.sound.play('celebrate'); return; }

        // No celebrate.mp3 yet — synthesize a bright ascending sparkle arpeggio.
        const ctx = this.sound.context;
        if (!ctx || ctx.state !== 'running') return;
        const now   = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99, 1046.5];   // C5 E5 G5 C6
        notes.forEach((f, i) => {
            const t0   = now + i * 0.09;
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, t0);
            gain.gain.setValueAtTime(0.0001, t0);
            gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(t0);
            osc.stop(t0 + 0.55);
        });
    }

    // ── Centre name text (reused for every drop) ──────────────────────────────

    buildNameText() {
        this.nameText = this.add.text(this.W / 2, this.H * 0.5, '', {
            fontFamily: '"Quicksand", Arial, sans-serif',
            fontSize:   '260px',
            color:      '#ffffff',
            align:      'center',
            stroke:     '#000000',
            strokeThickness: 16,
        }).setOrigin(0.5).setDepth(30).setScale(0);
    }

    // Big centred name that hovers until the player taps (no auto-hide).
    showName(text) {
        this.tweens.killTweensOf(this.nameText);
        this.nameText.setText(text).setScale(0).setVisible(true);
        // Shrink to fit the width for the longer words (e.g. "blocks").
        const maxW = this.W - 60;
        this._nameFit = Math.min(1, maxW / Math.max(1, this.nameText.width));
        this.tweens.add({ targets: this.nameText, scale: this._nameFit, duration: 240, ease: 'Back.easeOut' });
    }

    // Quick "pop" then vanish, on the player's tap.
    popName() {
        const s = this._nameFit || 1;
        this.tweens.killTweensOf(this.nameText);
        this.tweens.add({
            targets: this.nameText, scale: s * 1.3, duration: 110, ease: 'Quad.easeOut',
            onComplete: () => this.tweens.add({
                targets: this.nameText, scale: 0, duration: 140, ease: 'Back.easeIn',
            }),
        });
    }

    // ── Toys ──────────────────────────────────────────────────────────────────

    spawnToys() {
        this.toys = [];
        const n = this.toyDefs.length;
        this.toyDefs.forEach((def, i) => {
            // Spread across the width and stack above the screen so they rain
            // down. Each toy gets its own rest height in the rug band, so they
            // scatter across the rug rather than landing in one line.
            const t = n === 1 ? 0.5 : i / (n - 1);
            const x = Phaser.Math.Linear(this.W * 0.16, this.W * 0.84, t) + Phaser.Math.Between(-30, 30);
            const restY = Phaser.Math.Between(this.RUG_TOP, this.RUG_BOTTOM);

            const toy = this.physics.add.image(x, -150 - i * 130, def.img);
            toy.unitScale = this.TOY_TARGET / Math.max(toy.width, toy.height);  // size at perspective factor 1
            toy.toyId     = def.id;
            toy.restY     = restY;
            toy.landed    = false;
            // Draw order: lower (nearer) toys in front.
            const yFrac = (restY - this.RUG_TOP) / Math.max(1, this.RUG_BOTTOM - this.RUG_TOP);
            toy.baseDepth = 7 + yFrac * 4;
            toy.setDepth(toy.baseDepth);
            this.applyPerspective(toy);                 // initial size from spawn Y (small up high)
            toy.setAngle(Phaser.Math.Between(-15, 15));
            toy.setCollideWorldBounds(true);
            toy.setBounce(0.15);
            toy.setDragX(200);                       // settle horizontally, don't slide
            toy.setInteractive({ useHandCursor: true });
            this.input.setDraggable(toy);

            this.toys.push(toy);
        });
    }

    // ── Drag ──────────────────────────────────────────────────────────────────

    setupDrag() {
        this.input.on('dragstart', (_p, obj) => {
            if (this._ending || this._dragLocked) return;
            this.tweens.killTweensOf(obj);            // stop a wobble if this toy was being pointed at
            obj.setAngle(Phaser.Math.Between(-12, 12));
            if (obj.body) obj.body.enable = false;   // follow the finger, gravity off while held
            obj.setDepth(20);                         // held toy on top
            this.applyPerspective(obj, 1.12);         // perspective + slight pick-up emphasis
        });

        this.input.on('drag', (_p, obj, dragX, dragY) => {
            if (this._ending || this._dragLocked) return;
            obj.setPosition(dragX, dragY);
            this.applyPerspective(obj, 1.12);         // grows as it's pulled lower (closer)
            // Light up the box when the toy is over it.
            const near = Phaser.Math.Distance.Between(dragX, dragY, this.boxX, this.boxY) < this.BOX_RADIUS;
            this.boxGlow.setAlpha(near ? 0.55 : 0);
        });

        this.input.on('dragend', (_p, obj) => {
            if (this._ending || this._dragLocked) return;
            this.boxGlow.setAlpha(0);
            const dist = Phaser.Math.Distance.Between(obj.x, obj.y, this.boxX, this.boxY);
            if (dist < this.BOX_RADIUS) {
                this.dropInBox(obj);
            } else {
                // Rest where dropped if it's on the rug; only fall (gravity) if it
                // was released up in the air above the rug's back edge.
                const onRug = obj.y >= this.RUG_TOP;
                obj.restY = onRug ? obj.y : this.RUG_TOP;
                obj.baseDepth = 7 + Phaser.Math.Clamp(
                    (obj.restY - this.RUG_TOP) / Math.max(1, this.RUG_BOTTOM - this.RUG_TOP), 0, 1) * 4;
                obj.setDepth(obj.baseDepth);
                if (obj.body) {
                    obj.body.enable = true;
                    obj.setVelocity(0, 0);
                    obj.body.setAllowGravity(!onRug);   // gravity only when above the rug
                    obj.landed = onRug;
                }
                this.applyPerspective(obj);
                if (Math.random() < 0.4) this.playVoice(Phaser.Utils.Array.GetRandom(PHRASES.tidyOops));
            }
        });
    }

    dropInBox(obj) {
        if (obj.body) obj.body.enable = false;
        obj.disableInteractive();
        this.input.setDraggable(obj, false);
        this.tweens.killTweensOf(obj);

        this.playPlop();
        this.boxGlow.setAlpha(0.7);
        this.tweens.add({ targets: this.boxGlow, alpha: 0, duration: 300 });

        const isLast  = this.remaining - 1 <= 0;
        const dropNum = ++this._dropNum;
        this.remaining--;
        this._dragLocked    = true;    // freeze the other toys during the reveal
        this._revealToy     = obj;
        this._revealIsLast  = isLast;
        this._revealDropNum = dropNum;

        // Lift the dropped toy onto the box and hold it visible.
        this.tweens.add({
            targets:  obj,
            x:        this.boxX,
            y:        this.boxY - this.BOX_SIZE * 0.22,
            scale:    obj.unitScale * 1.15,
            angle:    0,
            duration: 280,
            ease:     'Back.easeOut',
        });

        // Show the big centred name + speak it, then wait for a tap to continue.
        const reveal = () => {
            this.showName(obj.toyId);
            this.playVoice(PHRASES.tidyName[obj.toyId]);
            this._revealActive = true;
            this.input.once('pointerdown', () => this.resolveReveal());
        };

        const sayBefore = !isLast && this._beforeDrops.has(dropNum) && this.cache.audio.exists('in_it_goes_1');
        if (sayBefore) {
            this.playVoiceThen('in_it_goes_1', reveal, 1100);   // "in it goes" before the name
        } else {
            this.time.delayedCall(280, reveal);                 // name straight after the drop sound
        }
    }

    // Player tapped while a name is showing — pop the name + toy and move on.
    resolveReveal() {
        if (!this._revealActive) return;
        this._revealActive = false;

        const toy    = this._revealToy;
        const isLast = this._revealIsLast;
        this.popName();
        if (toy && toy.active) this.popToy(toy);

        if (isLast) {
            // Final: box closes, stars + sound, then the "all done" line, then exit.
            this._ending = true;
            this.time.delayedCall(220, () => {
                this.closeBox();
                this.setCharEmotion('jumping');
                this.pulse(this.charSprite, 1.18);
                this.starBurst();
                this.playCelebrate();
                this.time.delayedCall(900, () => this.playEndLine());
            });
        } else {
            // Re-allow dragging after this tap's event.
            this.time.delayedCall(60, () => { this._dragLocked = false; });
            // On scheduled drops only: "what about that one?" once the name has
            // gone, pointing to a remaining toy.
            if (this._afterDrops.has(this._revealDropNum)) {
                this.time.delayedCall(280, () => {
                    if (this._ending) return;
                    const left = this.toys.filter(t => t.active && t.body && t.body.enable);
                    this.playVoice('in_it_goes_2');
                    if (left.length) this.wobbleToy(Phaser.Utils.Array.GetRandom(left));
                });
            }
        }
    }

    popToy(toy) {
        this.tweens.killTweensOf(toy);
        const s = toy.scaleX || 1;
        this.tweens.add({
            targets: toy, scale: s * 1.4, duration: 110, ease: 'Quad.easeOut',
            onComplete: () => this.tweens.add({
                targets: toy, scale: 0, alpha: 0, duration: 130, ease: 'Back.easeIn',
                onComplete: () => toy.destroy(),
            }),
        });
    }

    wobbleToy(toy) {
        if (!toy || !toy.active) return;
        const base = toy.angle;
        this.tweens.killTweensOf(toy);
        this.tweens.add({
            targets:  toy,
            angle:    { from: base - 12, to: base + 12 },
            duration: 110,
            yoyo:     true,
            repeat:   4,
            ease:     'Sine.easeInOut',
            onComplete: () => { if (toy.active) toy.setAngle(base); },
        });
    }

    // ── Ending ────────────────────────────────────────────────────────────────

    // Final "all done" after the stars, then back to the main game. Uses all_tidy
    // if recorded, otherwise the existing all_done / well_done_1 so it's never silent.
    playEndLine() {
        let pool = PHRASES.allTidy.filter(k => this.cache.audio.exists(k));
        if (pool.length === 0) pool = ['all_done', 'well_done_1'].filter(k => this.cache.audio.exists(k));
        const key = pool.length ? Phaser.Utils.Array.GetRandom(pool) : null;
        this.playVoiceThen(
            key,
            () => this.scene.start('PlayScene', { characterId: this.characterId, fromMinigame: true }),
            1600
        );
    }

    // ── Audio (interrupt-based, no input locking in this scene) ───────────────

    playVoice(key) {
        if (!key || !this.cache.audio.exists(key)) return;
        if (this._voice) { this._voice.stop(); this._voice.destroy(); }
        const snd = this.sound.add(key);
        this._voice = snd;
        snd.once('complete', () => {
            snd.destroy();
            if (this._voice === snd) this._voice = null;
        });
        snd.play();
    }

    // Play a line and fire cb when it finishes — or after `fallback` ms if the
    // clip doesn't exist yet, so the flow never stalls on missing audio.
    playVoiceThen(key, cb, fallback) {
        let fired = false;
        const fire = () => { if (!fired) { fired = true; cb(); } };
        if (key && this.cache.audio.exists(key)) {
            if (this._voice) { this._voice.stop(); this._voice.destroy(); }
            const snd = this.sound.add(key);
            this._voice = snd;
            snd.once('complete', () => { snd.destroy(); if (this._voice === snd) this._voice = null; fire(); });
            snd.play();
            this.time.delayedCall(fallback + 3000, fire);   // safety net
        } else {
            this.time.delayedCall(fallback, fire);
        }
    }

    playPlop() {
        // Fire-and-forget — overlaps freely with voice lines.
        if (this.sound.mute) return;
        if (this.cache.audio.exists('plop')) { this.sound.play('plop'); return; }

        // No plop.mp3 yet — synthesize a soft mid-range "thunk" (carries on phone
        // speakers). Swap for the recorded clip later.
        const ctx = this.sound.context;
        if (!ctx || ctx.state !== 'running') return;
        const now  = ctx.currentTime;
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(140, now + 0.09);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.3, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
    }
}
