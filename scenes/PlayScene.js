class PlayScene extends Phaser.Scene {
    constructor() {
        super('PlayScene');
    }

    init(data) {
        this.characterId = data.characterId || localStorage.getItem('tcm_character') || 'dolly';
        this.fromSelect  = !!data.fromSelect;
        localStorage.setItem('tcm_character', this.characterId);
        this.sound.mute = localStorage.getItem('tcm_mute') === '1';
    }

    create() {
        const W = this.scale.width;
        const H = this.scale.height;
        this.W = W;
        this.H = H;

        this.TRAY_H    = Math.round(H * 0.20);
        this.TRAY_Y    = H - this.TRAY_H / 2;
        this.charY     = (H * 0.18 + (H - this.TRAY_H)) / 2;
        this.ITEM_SIZE = Math.floor(W / 3 * 0.85);

        this.CATEGORY_COLORS = {
            food:    0xFFAA55,
            drink:   0x66AAFF,
            sleep:   0xBB88FF,
            comfort: 0xFF88BB,
            play:    0x55CC88,
        };

        this.trayObjects    = [];
        this.trayLabels     = [];
        this.currentRequest = null;
        this.wrongCount     = 0;
        this.idleTween      = null;
        this._menuOpen      = false;

        this.buildStaticUI();
        this.setupDragEvents();
        this.setupAudioQueue();
        this.initDeck();

        if (this.fromSelect) {
            this.queueAudio(PHRASES.nextChosen());
            this.queueThen(() => this.loadNextTray());
        } else {
            this.loadNextTray();
        }
    }

    // ── Static UI ────────────────────────────────────────────────────────────

    buildStaticUI() {
        const { W, H, TRAY_Y } = this;

        if (this.textures.exists('bg_room')) {
            this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0xF2E4D4);
        }

        this.requestText = this.add.text(W / 2, H * 0.10, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize:   '72px',
            color:      '#ffffff',
            align:      'center',
            wordWrap:   { width: W - 80 },
            stroke:     '#000000',
            strokeThickness: 8,
        }).setOrigin(0.5).setDepth(10);

        this.charX = W / 2;

        const neutralKey = `${this.characterId}_neutral`;
        if (this.textures.exists(neutralKey)) {
            this.charSprite = this.add.image(this.charX, this.charY, neutralKey);
            this.scaleChar();
        } else {
            this.charSprite = this.add.circle(this.charX, this.charY, 150, 0xFFAACC);
            this.add.text(this.charX, this.charY, 'Character', {
                fontFamily: 'Arial, sans-serif',
                fontSize:   '40px',
                color:      '#ffffff'
            }).setOrigin(0.5);
        }
        this.charSprite.setDepth(5);

        this.addParentZone();
        this.buildCharacterSwitcher();
        this.startIdle();

    }

    // ── Character switcher ───────────────────────────────────────────────────

    buildCharacterSwitcher() {
        if (this._switcherBgs)    this._switcherBgs.forEach(o => o.destroy());
        if (this._switcherImgs)   this._switcherImgs.forEach(o => o.destroy());
        this._switcherBgs  = [];
        this._switcherImgs = [];

        const SIZE = Math.round(this.W * 0.14);
        const PAD  = 10;
        const cx   = PAD + SIZE / 2;

        CHARACTERS.filter(c => c.id !== this.characterId).forEach((char, i) => {
            const cy  = PAD + SIZE / 2 + i * (SIZE + PAD);
            const key = char.neutral;

            const bg = this.add.circle(cx, cy, SIZE / 2 + 6, 0xFFFFFF, 0.55).setDepth(19);
            this._switcherBgs.push(bg);

            let img;
            if (this.textures.exists(key)) {
                img = this.add.image(cx, cy, key);
                img.setScale(SIZE / Math.max(img.width, img.height));
            } else {
                img = this.add.circle(cx, cy, SIZE / 2, char.color);
            }
            img.setDepth(20).setInteractive();

            img.on('pointerdown', () => {
                this.characterId = char.id;
                localStorage.setItem('tcm_character', this.characterId);
                this.setCharEmotion('neutral');
                this.buildCharacterSwitcher();
            });

            this._switcherImgs.push(img);
        });
    }

    // ── Audio queue ──────────────────────────────────────────────────────────
    //
    // Mobile browsers (especially iOS) block Web Audio until the first user
    // gesture. Phaser resumes the AudioContext on first touch and emits
    // 'unlocked' on the sound manager. The queue holds keys while locked and
    // drains automatically once unlocked.

    setupAudioQueue() {
        this._queue        = [];
        this._busy         = false;
        this._currentSound = null;

        if (this.sound.locked) {
            this.sound.once('unlocked', () => this._nextAudio());
        }

        this.events.once('shutdown', () => {
            this._queue = [];
            this._busy  = false;
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

    interruptAudio(key) {
        if (!key || !this.cache.audio.exists(key)) return;
        if (this._currentSound) {
            this._currentSound.off('complete');
            this._currentSound.stop();
            this._currentSound.destroy();
            this._currentSound = null;
        }
        this._queue = [];
        this._busy  = false;
        this._queue.push(key);
        if (!this.sound.locked) this._nextAudio();
    }

    queueThen(fn) {
        this._queue.push(fn);
        if (!this._busy && !this.sound.locked) this._nextAudio();
    }

    _nextAudio() {
        if (this._queue.length === 0) { this._busy = false; return; }
        this._busy    = true;
        const item    = this._queue.shift();
        if (typeof item === 'function') {
            this._busy = false;
            item();
            this._nextAudio();
            return;
        }
        const snd = this.sound.add(item);
        this._currentSound = snd;
        snd.once('complete', () => {
            snd.destroy();
            this._currentSound = null;
            this._nextAudio();
        });
        snd.play();
    }

    // ── Parent menu ───────────────────────────────────────────────────────────
    //
    // Hidden 100×100 zone in the top-right corner. Hold for 2 seconds to open
    // the parent menu. A subtle arc draws during the hold so a parent can see
    // it's registering without it being obvious to a child.

    addParentZone() {
        const { W }  = this;
        const ZX     = W - 50;
        const ZY     = 50;
        const zone   = this.add.zone(ZX, ZY, 100, 100).setDepth(30).setInteractive();

        let arcGfx  = null;
        let arcObj  = null;
        let arcTween = null;

        const cancelHold = () => {
            if (arcTween)  { arcTween.stop();    arcTween = null; }
            if (arcGfx)    { arcGfx.destroy();   arcGfx = null; }
            arcObj = null;
        };

        zone.on('pointerdown', () => {
            if (this._menuOpen) return;
            arcObj  = { t: 0 };
            arcGfx  = this.add.graphics().setDepth(31);
            arcTween = this.tweens.add({
                targets:  arcObj,
                t:        1,
                duration: 2000,
                ease:     'Linear',
                onUpdate: () => {
                    arcGfx.clear();
                    arcGfx.lineStyle(4, 0xFFFFFF, 0.75);
                    arcGfx.beginPath();
                    arcGfx.arc(ZX, ZY, 22, -Math.PI / 2,
                        -Math.PI / 2 + Math.PI * 2 * arcObj.t, false);
                    arcGfx.strokePath();
                },
                onComplete: () => {
                    this.input.off('pointerup', cancelHold);
                    arcGfx.destroy(); arcGfx = null;
                    arcTween = null;
                    this._menuOpen = true;
                    this.showParentMenu();
                },
            });
            this.input.once('pointerup', cancelHold);
        });
    }

    showParentMenu() {
        const { W, H } = this;
        const els = [];

        const dismiss = () => {
            this._menuOpen = false;
            els.forEach(e => { if (e && e.destroy) e.destroy(); });
        };

        // Dim overlay — tapping it dismisses the menu
        const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.45)
            .setDepth(50).setInteractive();
        overlay.on('pointerdown', dismiss);
        els.push(overlay);

        // Panel dimensions
        const PW = 340, BTN_H = 80, PAD = 24;
        const PH = PAD + BTN_H * 3 + PAD;
        const PX = W - PAD - PW;
        const PY = PAD;

        const panelGfx = this.add.graphics().setDepth(51);
        panelGfx.fillStyle(0xFFFAF5, 1);
        panelGfx.fillRoundedRect(PX, PY, PW, PH, 18);
        panelGfx.lineStyle(2, 0xDDD0C0, 1);
        panelGfx.strokeRoundedRect(PX, PY, PW, PH, 18);
        els.push(panelGfx);

        const btnDefs = [
            { label: this.sound.mute ? 'Unmute' : 'Mute', id: 'mute' },
            { label: 'Change character',                    id: 'change' },
            { label: 'Exit',                                id: 'exit' },
        ];

        btnDefs.forEach((def, i) => {
            const bx    = PX + PW / 2;
            const by    = PY + PAD + BTN_H * i + BTN_H / 2;
            const bw    = PW - 20;
            const bh    = BTN_H - 12;
            const bLeft = PX + 10;
            const bTop  = by - bh / 2;

            const isMuteActive = def.id === 'mute' && this.sound.mute;
            const btnGfx = this.add.graphics().setDepth(52);
            const drawBtn = (color) => {
                btnGfx.clear();
                btnGfx.fillStyle(color, 1);
                btnGfx.fillRoundedRect(bLeft, bTop, bw, bh, 12);
            };
            drawBtn(isMuteActive ? 0xDDE0FF : 0xF0E8DF);
            els.push(btnGfx);

            const txt = this.add.text(bx, by, def.label, {
                fontFamily: 'Arial, sans-serif',
                fontSize:   '36px',
                color:      '#5A3A2A',
            }).setOrigin(0.5).setDepth(54);
            els.push(txt);

            const hit = this.add.zone(bx, by, bw, bh).setDepth(53).setInteractive();
            els.push(hit);

            hit.on('pointerdown', () => {
                if (def.id === 'mute') {
                    this.sound.mute = !this.sound.mute;
                    localStorage.setItem('tcm_mute', this.sound.mute ? '1' : '0');
                    txt.setText(this.sound.mute ? 'Unmute' : 'Mute');
                    drawBtn(this.sound.mute ? 0xDDE0FF : 0xF0E8DF);
                } else if (def.id === 'change') {
                    dismiss();
                    localStorage.removeItem('tcm_character');
                    this.scene.start('SelectScene');
                } else {
                    dismiss();
                    window.close();
                }
            });
        });

        // Fade the whole menu in
        els.forEach(e => { if (e.setAlpha) e.setAlpha(0); });
        this.tweens.add({ targets: els, alpha: 1, duration: 150 });
    }

    // ── Character animation ──────────────────────────────────────────────────

    startIdle() {
        this.idleTween = this.tweens.add({
            targets:  this.charSprite,
            y:        this.charY - 14,
            duration: 900,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut'
        });
    }

    scaleChar() {
        const maxW   = this.W * 0.85;
        const maxH   = (this.H - this.TRAY_H - this.H * 0.18) * 0.90;
        const scaleW = maxW / this.charSprite.width;
        const scaleH = maxH / this.charSprite.height;
        this.charSprite.setScale(Math.min(scaleW, scaleH));
    }

    setCharEmotion(emotion) {
        const key = `${this.characterId}_${emotion}`;
        if (this.charSprite.setTexture && this.textures.exists(key)) {
            this.charSprite.setTexture(key);
            this.scaleChar();
        }
    }

    celebrateChar() {
        if (this.idleTween) {
            this.idleTween.stop();
            this.idleTween = null;
        }
        this.charSprite.y = this.charY;

        this.tweens.add({
            targets:  this.charSprite,
            y:        this.charY - 50,
            duration: 110,
            yoyo:     true,
            repeat:   2,
            ease:     'Back.easeOut',
            onComplete: () => {
                this.charSprite.y = this.charY;
                this.startIdle();
            }
        });
    }

    // ── Drag events ──────────────────────────────────────────────────────────

    setupDragEvents() {
        this.input.on('dragstart', (_pointer, obj) => {
            this.children.bringToTop(obj);
            if (obj.label) this.children.bringToTop(obj.label);
        });

        this.input.on('drag', (_pointer, obj, dragX, dragY) => {
            obj.setPosition(dragX, dragY);
            if (obj.label) obj.label.setPosition(dragX, dragY);
        });

        this.input.on('dragend', (_pointer, obj) => {
            if (obj.isHinted) {
                this.handleCorrect(obj);
                return;
            }

            const charRadius  = (this.charSprite.displayHeight || 150) * 0.5;
            const dist        = Phaser.Math.Distance.Between(obj.x, obj.y, this.charX, this.charSprite.y);
            const onCharacter = dist < charRadius + this.ITEM_SIZE * 0.5;

            if (onCharacter && obj.itemData.id === this.currentRequest.id) {
                this.handleCorrect(obj);
            } else if (onCharacter) {
                this.handleWrong(obj);
            } else {
                this.returnToHome(obj);
            }
        });
    }

    // ── Deck ─────────────────────────────────────────────────────────────────

    initDeck() {
        this.deck      = Phaser.Utils.Array.Shuffle([...ITEMS]);
        this.deckIndex = 0;
    }

    dealBatch() {
        if (this.deckIndex >= this.deck.length) {
            this.deck      = Phaser.Utils.Array.Shuffle([...ITEMS]);
            this.deckIndex = 0;
        }
        const batch = this.deck.slice(this.deckIndex, this.deckIndex + 3);
        this.deckIndex += 3;
        return batch;
    }

    // ── Tray ─────────────────────────────────────────────────────────────────

    loadNextTray() {
        this.clearTray();
        this.buildTray(this.dealBatch());
        this.pickRequest();
    }

    clearTray() {
        this.trayObjects.forEach(o => {
            this.tweens.killTweensOf(o);
            if (o.glowObject) {
                this.tweens.killTweensOf(o.glowObject);
                o.glowObject.destroy();
            }
            o.destroy();
        });
        this.trayLabels.forEach(l => { if (l) l.destroy(); });
        this.trayObjects = [];
        this.trayLabels  = [];
    }

    buildTray(items) {
        items.forEach((itemData, i) => {
            const x     = this.W * (2 * i + 1) / 6;
            const y     = this.TRAY_Y;
            const color = this.CATEGORY_COLORS[itemData.category];

            let obj;
            if (this.textures.exists(itemData.image)) {
                obj = this.add.image(x, y, itemData.image);
                const scale = this.ITEM_SIZE / Math.max(obj.width, obj.height);
                obj.setScale(scale);
            } else {
                obj = this.add.rectangle(x, y, this.ITEM_SIZE, this.ITEM_SIZE, color);
            }

            obj.setDepth(6).setInteractive();
            this.input.setDraggable(obj);
            obj.homeX    = x;
            obj.homeY    = y;
            obj.itemData = itemData;

            let label = null;
            if (!this.textures.exists(itemData.image)) {
                label = this.add.text(x, y, itemData.name, {
                    fontFamily: 'Arial, sans-serif',
                    fontSize:   '20px',
                    color:      '#ffffff',
                    align:      'center',
                    wordWrap:   { width: this.ITEM_SIZE - 10 }
                }).setOrigin(0.5).setDepth(7);
            }

            obj.label = label;
            this.trayObjects.push(obj);
            this.trayLabels.push(label);
        });
    }

    // ── Request ───────────────────────────────────────────────────────────────

    pickRequest() {
        const active = this.trayObjects.filter(o => o.visible);
        if (active.length === 0) return;

        this.wrongCount     = 0;
        const chosen        = Phaser.Utils.Array.GetRandom(active);
        this.currentRequest = chosen.itemData;
        const displayName   = this.currentRequest.name.charAt(0).toUpperCase() + this.currentRequest.name.slice(1);
        this.requestText.setText(displayName);
        const NEEDY_CHANCE = 0.4;
        this.setCharEmotion(Math.random() < NEEDY_CHANCE ? 'needy' : 'neutral');
        this.interruptAudio(this.currentRequest.audio);
    }

    // ── Correct ───────────────────────────────────────────────────────────────

    handleCorrect(obj) {
        if (obj.correctHandled) return;
        obj.correctHandled = true;

        this.tweens.killTweensOf(obj);
        obj.setAngle(0);
        if (obj.glowObject) {
            this.tweens.killTweensOf(obj.glowObject);
            obj.glowObject.destroy();
            obj.glowObject = null;
        }

        const idx = this.trayObjects.indexOf(obj);
        if (idx !== -1 && this.trayLabels[idx]) this.trayLabels[idx].setVisible(false);
        obj.setVisible(false);

        this.setCharEmotion('happy');
        this.celebrateChar();
        this.queueAudio(Phaser.Utils.Array.GetRandom(PHRASES.thankYou));

        const remaining = this.trayObjects.filter(o => o.visible);

        if (remaining.length === 0) {
            this.requestText.setText('');
            this.queueAudio(PHRASES.allDone);
            this.queueThen(() => {
                this.setCharEmotion('neutral');
                this.time.delayedCall(400, () => this.loadNextTray());
            });
        } else {
            this.queueThen(() => this.pickRequest());
        }
    }

    // ── Wrong ─────────────────────────────────────────────────────────────────

    handleWrong(obj) {
        this.wrongCount++;
        this.setCharEmotion('needy');
        this.returnToHome(obj);
        this.interruptAudio(this.currentRequest.audio);

        if (this.wrongCount >= 3) {
            this.showHint();
        }
    }

    showHint() {
        const target = this.trayObjects.find(
            o => o.visible && o.itemData.id === this.currentRequest.id
        );
        if (!target || target.isHinted) return;

        const glowW = (target.displayWidth  || this.ITEM_SIZE) + 26;
        const glowH = (target.displayHeight || this.ITEM_SIZE) + 26;

        const glow = this.add.rectangle(target.homeX, target.homeY, glowW, glowH, 0xFFEE44).setDepth(5);
        this.tweens.add({
            targets:  glow,
            alpha:    { from: 0.3, to: 1 },
            duration: 500,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut'
        });

        this.tweens.add({
            targets:  target,
            angle:    { from: -8, to: 8 },
            duration: 250,
            yoyo:     true,
            repeat:   -1,
            ease:     'Sine.easeInOut'
        });

        target.isHinted   = true;
        target.glowObject = glow;
        target.once('pointerup', () => this.handleCorrect(target));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    returnToHome(obj) {
        this.tweens.add({
            targets:  obj,
            x:        obj.homeX,
            y:        obj.homeY,
            duration: 300,
            ease:     'Back.easeOut',
            onUpdate: () => {
                if (obj.label) obj.label.setPosition(obj.x, obj.y);
            }
        });
    }
}
