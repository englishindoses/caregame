// Care-game break menu, with four picture tiles.
class MiniGameSelectScene extends Phaser.Scene {
    constructor() {
        super('MiniGameSelectScene');
    }

    init(data) {
        this.characterId = data.characterId || localStorage.getItem('tcm_character') || 'dolly';
        this.sound.mute  = localStorage.getItem('tcm_mute') === '1';
    }

    // The select screen's own assets — its tile art and the spoken lines (the
    // "what shall we play?" invite + each tile's "let's play" line). Each
    // mini-game's *gameplay* assets are loaded later by its own scene. Tile
    // images that are already main-game assets (item_ball, item_car) are skipped.
    preload() {
        if (!this._miniLoadHooked) {
            this._miniLoadHooked = true;
            this.load.on('loaderror', f => console.warn(`Missing asset: ${f.key}`));
        }
        MINIGAMES.forEach(g => {
            if (g.imageSrc && !this.textures.exists(g.image)) this.load.image(g.image, g.imageSrc);
        });
        const keys = [...PHRASES.playInvite];
        MINIGAMES.forEach(g => {
            const pool = PHRASES[g.chosenGroup];
            if (pool) keys.push(...pool);
        });
        keys.forEach(key => {
            if (!this.cache.audio.exists(key)) this.load.audio(key, `assets/audio/${key}.mp3`);
        });
    }

    create() {
        addMuteButton(this);
        const W = this.scale.width;
        const H = this.scale.height;
        this.W = W;
        this.H = H;

        this.setupAudioQueue();
        this._launching = false;
        this.memoryVoice = createSceneVoice(this);
        makeMemoryTileTexture(this);

        // Same bedroom so the transition from PlayScene feels continuous.
        if (this.textures.exists('bg_room')) {
            this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0xF2E4D4);
        }

        this.add.text(W * 0.55, H * 0.10, 'What shall\nwe play?', {
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
            const cy = H * 0.90;
            const sprite = this.add.image(cx, cy, charKey);
            this.charSprite = sprite;
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

        addCharacterSwitcher(this, () => {
            if (this.charSprite) {
                this.charSprite.setTexture(`${this.characterId}_happy`);
                this.charSprite.setScale(Math.min(W * 0.32, H * 0.22) / Math.max(this.charSprite.width, this.charSprite.height));
            }
        });
        this.buildTiles();
        addDoorButton(this);   // hold-to-exit, same as the main game

        // Invite audio on entry; input stays locked until it finishes.
        this.queueAudio(Phaser.Utils.Array.GetRandom(PHRASES.playInvite));
    }

    // Lay the mini-game tiles out in a grid that supports up to 4 options.
    // 1 → centred, 2 → side by side, 3–4 → 2×2. Positions derive from screen
    // size so the layout adapts automatically as MINIGAMES grows.
    buildTiles() {
        const { W, H } = this;
        const n    = MINIGAMES.length;
        const TILE = Math.min(W * 0.35, H * 0.21);
        const cols = n <= 1 ? 1 : 2;

        MINIGAMES.forEach((game, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            const x   = cols === 1 ? W / 2 : W * (col ? 0.75 : 0.25);
            const y   = H * 0.35 + row * H * 0.28;
            this.makeTile(game, x, y, TILE);
        });
    }

    makeTile(game, x, y, TILE) {
        // The tile is the tap target; its full bounding box is the hit area, so
        // a tap anywhere on it counts — important for a child.
        let target, baseScale;
        if (this.textures.exists(game.image)) {
            target = this.add.image(x, y, game.image).setDepth(6);
            baseScale = (TILE * Math.min(1, 0.95 * (game.tileScale || 1))) / Math.max(target.width, target.height);
            target.setScale(baseScale);
        } else {
            // Placeholder coloured box until the real tile art exists.
            target = this.add.rectangle(x, y, TILE * 0.85, TILE * 0.85, 0xC79A5B).setDepth(6);
            target.setStrokeStyle(5, 0x8A6A3A, 1);
            baseScale = 1;
            this.add.text(x, y, game.name, {
                fontFamily: 'Arial, sans-serif',
                fontSize:   '40px',
                color:      '#ffffff',
                stroke:     '#000000',
                strokeThickness: 5,
            }).setOrigin(0.5).setDepth(7);
        }
        this.add.text(x, y + TILE * 0.70, game.name, {
            fontFamily: 'Quicksand, Arial, sans-serif', fontSize: `${this.W * 0.060}px`,
            color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 5,
        }).setOrigin(0.5).setDepth(7);
        const hit = this.add.zone(x, y + TILE * 0.16, this.W * 0.44, TILE * 1.55)
            .setDepth(8).setInteractive({ useHandCursor: true });

        // Gentle idle pulse so the tile invites a tap.
        this.tweens.add({
            targets:  target,
            scale:    { from: baseScale, to: baseScale * 1.05 },
            duration: 1500,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut',
        });

        hit.on('pointerdown', () => {
            if (this._inputLocked || this._launching || this._navigationOpen) return;
            this._launching = true;
            this.tweens.killTweensOf(target);
            target.setScale(baseScale);
            this.tweens.add({
                targets:  target,
                scale:    baseScale * 1.12,
                duration: 150,
                yoyo:     true,
                ease:     'Back.easeOut',
            });
            const launch = () => this.time.delayedCall(0, () => {
                this.scene.start(game.scene, { characterId: this.characterId, mode: game.mode });
            });
            if (game.chosenText) {
                this.memoryVoice.play(null, game.chosenText, launch);
            } else {
                const chosenPool = PHRASES[game.chosenGroup] || PHRASES.playCatch;
                this.queueAudio(Phaser.Utils.Array.GetRandom(chosenPool));
                this.queueThen(launch);
            }
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
