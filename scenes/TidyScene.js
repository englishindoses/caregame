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
        this.boxY        = H * 0.87;   // toy box on the open foreground floor
        this.BOX_SIZE    = W * 0.40;
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
        this.TOY_TARGET  = W * 0.18;

        this.remaining = this.toyDefs.length;
        this._ending   = false;
        this._voice    = null;

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

        this.buildCharacter();

        // Toys scatter from the character's feet down to the (raised) rug edge.
        this.charFeetY = this.charSprite.y + this.charSprite.displayHeight / 2;
        this.RUG_TOP   = this.charFeetY;

        this.buildBox();
        this.buildNameText();
        this.spawnToys();
        this.setupDrag();

        // Opening line interrupts straight away (silent until recorded).
        this.playVoice(Phaser.Utils.Array.GetRandom(PHRASES.tidyOpening));
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

        // Soft glow behind the box; brightens when a dragged toy is over it.
        this.boxGlow = this.add.rectangle(this.boxX, this.boxY,
            this.BOX_SIZE * 1.15, this.BOX_SIZE * 0.95, 0xFFF1A8, 0).setDepth(4);

        if (this.textures.exists('mini_toybox')) {
            this.boxObj = this.add.image(this.boxX, startY, 'mini_toybox').setDepth(6);
            this.boxBase = this.BOX_SIZE / Math.max(this.boxObj.width, this.boxObj.height);
            this.boxObj.setScale(this.boxBase);
        } else {
            // Placeholder coloured box until the real toy-box art exists.
            this.boxObj = this.add.rectangle(this.boxX, startY,
                this.BOX_SIZE, this.BOX_SIZE * 0.8, 0xC79A5B).setDepth(6);
            this.boxObj.setStrokeStyle(5, 0x8A6A3A, 1);
            this.boxBase = 1;
            this.boxLabel = this.add.text(this.boxX, startY, 'Toy Box', {
                fontFamily: 'Arial, sans-serif',
                fontSize:   '40px',
                color:      '#ffffff',
                stroke:     '#000000',
                strokeThickness: 5,
            }).setOrigin(0.5).setDepth(7);
        }

        // Slide up into place, then start the subtle idle pulse.
        this.tweens.add({
            targets:  this.boxLabel ? [this.boxObj, this.boxLabel] : this.boxObj,
            y:        this.boxY,
            duration: 500,
            ease:     'Back.easeOut',
            onComplete: () => {
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

    // ── Centre name text (reused for every drop) ──────────────────────────────

    buildNameText() {
        this.nameText = this.add.text(this.W / 2, this.H * 0.34, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize:   '88px',
            color:      '#ffffff',
            align:      'center',
            stroke:     '#000000',
            strokeThickness: 9,
        }).setOrigin(0.5).setDepth(15).setScale(0);
    }

    showName(text) {
        this.tweens.killTweensOf(this.nameText);
        this.nameText.setText(text).setScale(0);
        this.tweens.add({
            targets:  this.nameText,
            scale:    1,
            duration: 200,
            ease:     'Back.easeOut',
            onComplete: () => {
                this.time.delayedCall(800, () => {
                    this.tweens.add({ targets: this.nameText, scale: 0, duration: 200, ease: 'Back.easeIn' });
                });
            },
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
            if (this._ending) return;
            if (obj.body) obj.body.enable = false;   // follow the finger, gravity off while held
            obj.setDepth(20);                         // held toy on top
            this.applyPerspective(obj, 1.12);         // perspective + slight pick-up emphasis
        });

        this.input.on('drag', (_p, obj, dragX, dragY) => {
            if (this._ending) return;
            obj.setPosition(dragX, dragY);
            this.applyPerspective(obj, 1.12);         // grows as it's pulled lower (closer)
            // Light up the box when the toy is over it.
            const near = Phaser.Math.Distance.Between(dragX, dragY, this.boxX, this.boxY) < this.BOX_RADIUS;
            this.boxGlow.setAlpha(near ? 0.55 : 0);
        });

        this.input.on('dragend', (_p, obj) => {
            if (this._ending) return;
            this.boxGlow.setAlpha(0);
            const dist = Phaser.Math.Distance.Between(obj.x, obj.y, this.boxX, this.boxY);
            if (dist < this.BOX_RADIUS) {
                this.dropInBox(obj);
            } else {
                // Dropped in the air → gravity pulls it back down to its rug level.
                obj.setDepth(obj.baseDepth);
                if (obj.body) {
                    obj.body.enable = true;
                    obj.body.setAllowGravity(true);
                    obj.setVelocity(0, 0);
                    obj.landed = false;
                }
                this.applyPerspective(obj);
                if (Math.random() < 0.4) this.playVoice(Phaser.Utils.Array.GetRandom(PHRASES.tidyOops));
            }
        });
    }

    dropInBox(obj) {
        if (obj.body) obj.body.enable = false;   // no physics while it tweens into the box
        obj.disableInteractive();
        this.input.setDraggable(obj, false);

        this.playPlop();
        this.playVoice(PHRASES.tidyName[obj.toyId]);   // names the toy, interrupts prior voice
        this.showName(obj.toyId.charAt(0).toUpperCase() + obj.toyId.slice(1));

        // Flash the box glow as a "received" cue.
        this.boxGlow.setAlpha(0.7);
        this.tweens.add({ targets: this.boxGlow, alpha: 0, duration: 300 });

        // Toy shrinks into the box and is destroyed.
        this.tweens.add({
            targets:  obj,
            x:        this.boxX,
            y:        this.boxY - this.BOX_SIZE * 0.1,
            scale:    0,
            angle:    obj.angle + Phaser.Math.Between(-90, 90),
            duration: 300,
            ease:     'Quad.easeIn',
            onComplete: () => obj.destroy(),
        });

        this.remaining--;
        if (this.remaining <= 0) this.finish();
    }

    // ── Ending ────────────────────────────────────────────────────────────────

    finish() {
        this._ending = true;
        this.setCharEmotion('jumping');
        this.pulse(this.charSprite, 1.18);

        // Let the final toy's name land, then the celebration line, then go back.
        this.time.delayedCall(700, () => {
            this.playVoiceThen(
                Phaser.Utils.Array.GetRandom(PHRASES.allTidy),
                () => this.scene.start('PlayScene', { characterId: this.characterId, fromMinigame: true }),
                1600
            );
        });
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
