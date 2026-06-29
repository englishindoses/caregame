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

        // Layout (reference resolution). The "floor" is a big band — toys scatter
        // across it and can be left anywhere on it.
        this.charX      = W / 2;
        this.charY      = H * 0.28;
        this.boxX       = W / 2;
        this.boxY       = H * 0.86;
        this.BOX_SIZE   = W * 0.40;
        this.BOX_RADIUS = Math.max(175, this.BOX_SIZE * 0.6);  // generous — a toddler won't aim precisely
        this.floorTop   = H * 0.40;
        this.floorBottom = H * 0.74;
        this.TOY_TARGET = W * 0.20;
        this.MIN_SPACING = 150;

        this.remaining = this.toyDefs.length;
        this._ending   = false;
        this._voice    = null;

        // Background.
        if (this.textures.exists('bg_room')) {
            this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0xF2E4D4);
        }

        this.buildCharacter();
        this.buildBox();
        this.buildNameText();
        this.spawnToys();
        this.setupDrag();

        // Opening line interrupts straight away (silent until recorded).
        this.playVoice(Phaser.Utils.Array.GetRandom(PHRASES.tidyOpening));
    }

    // ── Character ─────────────────────────────────────────────────────────────

    buildCharacter() {
        const key = `${this.characterId}_neutral`;
        this.charSprite = this.add.image(this.charX, this.charY, key).setDepth(5);
        if (this.textures.exists(key)) {
            const maxDim = Math.min(this.W * 0.40, this.H * 0.22);
            this.charScale = maxDim / Math.max(this.charSprite.width, this.charSprite.height);
            this.charSprite.setScale(this.charScale);
        }
        this.tweens.add({
            targets:  this.charSprite,
            y:        this.charY - 12,
            duration: 900,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut',
        });
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
        const placed = [];
        this.toyDefs.forEach((def, i) => {
            // Random non-overlapping spot in the floor band.
            let x = this.W / 2, y = (this.floorTop + this.floorBottom) / 2, tries = 0;
            do {
                x = Phaser.Math.Between(this.W * 0.14, this.W * 0.86);
                y = Phaser.Math.Between(this.floorTop, this.floorBottom);
                tries++;
            } while (tries < 20 && placed.some(p => Phaser.Math.Distance.Between(x, y, p.x, p.y) < this.MIN_SPACING));
            placed.push({ x, y });

            // Perspective: lower (nearer) toys are bigger.
            const yFrac = (y - this.floorTop) / (this.floorBottom - this.floorTop);
            const persp = Phaser.Math.Linear(0.75, 1.10, yFrac);

            const toy = this.add.image(x, -100, def.img).setDepth(7);
            const base = (this.TOY_TARGET / Math.max(toy.width, toy.height)) * persp;
            toy.baseScale = base;
            toy.toyId     = def.id;
            toy.setScale(base);
            toy.setAngle(Phaser.Math.Between(-20, 20));
            toy.setInteractive({ useHandCursor: true });
            this.input.setDraggable(toy);

            // Tumble in from above, staggered.
            toy.tumble = this.tweens.add({
                targets:  toy,
                y:        y,
                angle:    toy.angle + Phaser.Math.Between(-30, 30),
                duration: 700,
                delay:    i * 80,
                ease:     'Bounce.easeOut',
            });

            if (!this.toys) this.toys = [];
            this.toys.push(toy);
        });
    }

    // ── Drag ──────────────────────────────────────────────────────────────────

    setupDrag() {
        this.input.on('dragstart', (_p, obj) => {
            if (this._ending) return;
            if (obj.tumble) { obj.tumble.stop(); obj.tumble = null; }
            this.children.bringToTop(obj);
            obj.setScale(obj.baseScale * 1.1);   // "I've got it"
        });

        this.input.on('drag', (_p, obj, dragX, dragY) => {
            if (this._ending) return;
            obj.setPosition(dragX, dragY);
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
                // Stays exactly where it was left, on the floor. Just shrink back
                // from the pick-up scale. Occasionally a soft "oops".
                obj.setScale(obj.baseScale);
                if (Math.random() < 0.4) this.playVoice(Phaser.Utils.Array.GetRandom(PHRASES.tidyOops));
            }
        });
    }

    dropInBox(obj) {
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
