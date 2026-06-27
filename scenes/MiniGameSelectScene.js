// "What shall we play?" — shown after 3 cleared trays of the main game.
// For now there is only one tile (Catch), but the layout adapts to up to 4
// entries in MINIGAMES so adding more is just a data edit.
class MiniGameSelectScene extends Phaser.Scene {
    constructor() {
        super('MiniGameSelectScene');
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

        this.setupAudioQueue();

        // Same bedroom so the transition from PlayScene feels continuous.
        if (this.textures.exists('bg_room')) {
            this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0xF2E4D4);
        }

        this.add.text(W / 2, H * 0.10, 'What shall we play?', {
            fontFamily: 'Arial, sans-serif',
            fontSize:   '64px',
            color:      '#ffffff',
            align:      'center',
            wordWrap:   { width: W - 80 },
            stroke:     '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5).setDepth(10);

        // Chosen character sits small in the bottom-left, bobbing gently.
        const charKey = `${this.characterId}_happy`;
        if (this.textures.exists(charKey)) {
            const cx = W * 0.20;
            const cy = H * 0.82;
            const sprite = this.add.image(cx, cy, charKey);
            const maxDim = Math.min(W * 0.32, H * 0.22);
            sprite.setScale(maxDim / Math.max(sprite.width, sprite.height));
            sprite.setDepth(5);
            this.tweens.add({
                targets:  sprite,
                y:        cy - 12,
                duration: 900,
                yoyo:     true,
                repeat:   -1,
                ease:     'Sine.easeInOut',
            });
        }

        this.buildTiles();

        // Invite audio on entry; input stays locked until it finishes.
        this.queueAudio(Phaser.Utils.Array.GetRandom(PHRASES.playInvite));
    }

    // Lay the mini-game tiles out in a grid that supports up to 4 options.
    // 1 → centred, 2 → side by side, 3–4 → 2×2. Positions derive from screen
    // size so the layout adapts automatically as MINIGAMES grows.
    buildTiles() {
        const { W, H } = this;
        const n    = MINIGAMES.length;
        const TILE = Math.min(W * 0.42, H * 0.26);
        const cols = n <= 1 ? 1 : 2;
        const rows = Math.ceil(n / cols);
        const gapX = W * 0.10;
        const gapY = H * 0.06;
        const gridW = cols * TILE + (cols - 1) * gapX;
        const startX = W / 2 - gridW / 2 + TILE / 2;
        const gridH = rows * TILE + (rows - 1) * gapY;
        const centreY = H * 0.42;
        const startY = centreY - gridH / 2 + TILE / 2;

        MINIGAMES.forEach((game, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x   = startX + col * (TILE + gapX);
            const y   = startY + row * (TILE + gapY);
            this.makeTile(game, x, y, TILE);
        });
    }

    makeTile(game, x, y, TILE) {
        if (!this.textures.exists(game.image)) return;

        // The ball image itself is the tap target. Its full bounding box is the
        // hit area, so a tap anywhere on the ball counts — important for a child.
        const img = this.add.image(x, y, game.image).setDepth(6);
        const baseScale = (TILE * 0.85) / Math.max(img.width, img.height);
        img.setScale(baseScale);
        img.setInteractive({ useHandCursor: true });

        // Gentle idle pulse so the ball invites a tap.
        this.tweens.add({
            targets:  img,
            scale:    { from: baseScale, to: baseScale * 1.05 },
            duration: 1500,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut',
        });

        img.once('pointerdown', () => {
            if (this._inputLocked) return;
            this.tweens.killTweensOf(img);
            img.setScale(baseScale);
            this.tweens.add({
                targets:  img,
                scale:    baseScale * 1.2,
                duration: 150,
                yoyo:     true,
                ease:     'Back.easeOut',
            });
            const chosenPool = PHRASES[game.chosenGroup] || PHRASES.playCatch;
            this.queueAudio(Phaser.Utils.Array.GetRandom(chosenPool));
            this.queueThen(() => {
                this.scene.start(game.scene, { characterId: this.characterId });
            });
        });
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
