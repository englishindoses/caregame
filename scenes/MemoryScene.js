// Three level-3 sets as a care-game break, or an ongoing full game with the ladder.
class MemoryScene extends Phaser.Scene {
    constructor() { super('MemoryScene'); }

    init(data) {
        this.mode = data.mode === 'mini' ? 'mini' : 'full';
        this.characterId = data.characterId || localStorage.getItem('tcm_character') || 'dolly';
        this.sound.mute = localStorage.getItem('tcm_mute') === '1';
        this.level = this.mode === 'mini' ? 3 : readMemoryLevel();
        this._praiseIndex = 0;
        this.boardIndex = 0;
        this.setsCleared = 0;
        this.miniSetsCleared = 0;
        this.cards = [];
        this.locked = true;
    }

    preload() {
        if (!this.textures.exists('bg_memory')) this.load.image('bg_memory', 'assets/images/bg_memory.webp');
        [...Object.values(PHRASES.tidyName), ...PHRASES.memoryPraise.map(clip => clip.key)].forEach(key => {
            // Only existing shared recordings; new Memory lines use browser voice.
            if (!this.cache.audio.exists(key)) this.load.audio(key, `assets/audio/${key}.mp3`);
        });
    }

    create() {
        addMuteButton(this);
        this.W = this.scale.width;
        this.H = this.scale.height;
        if (this.textures.exists('bg_memory')) {
            this.add.image(this.W / 2, this.H / 2, 'bg_memory').setDisplaySize(this.W, this.H);
        } else {
            this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xF2E4D4);
        }
        this.voice = createSceneVoice(this);
        this.buildHud();
        this.makeStarTexture();
        addDoorButton(this);
        addCharacterSwitcher(this, () => this.setCharEmotion(this._emotion));
        this.events.once('shutdown', () => {
            this.cards.forEach(card => card.destroy());
            this.cards = [];
        });
        this.newSet();
    }

    buildHud() {
        const { W, H } = this;
        this.bigWord = this.add.text(W / 2, H * 0.10, '', {
            fontFamily: 'Quicksand, Arial, sans-serif', fontSize: `${W * 0.10}px`,
            color: '#ffffff', stroke: '#6c4b39', strokeThickness: 6, align: 'center',
        }).setOrigin(0.5).setDepth(40);
        this.charSprite = this.add.image(W * 0.19, H * 0.90, `${this.characterId}_neutral`).setDepth(5);
        this.charScale = Math.min(W * 0.31, H * 0.18) / Math.max(this.charSprite.width, this.charSprite.height);
        this.charSprite.setScale(this.charScale);
        this._emotion = 'neutral';
        this.tweens.add({ targets: this.charSprite, y: H * 0.90 - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    }

    setWord(word) {
        this.bigWord.setText(word ? word.charAt(0).toUpperCase() + word.slice(1) : '');
        this.bigWord.setScale(Math.min(1, this.W * 0.57 / Math.max(1, this.bigWord.width)));
    }

    setCharEmotion(emotion = 'neutral') {
        this._emotion = emotion;
        const key = `${this.characterId}_${emotion}`;
        this.charSprite.setTexture(this.textures.exists(key) ? key : `${this.characterId}_happy`);
        this.charScale = Math.min(this.W * 0.31, this.H * 0.18) / Math.max(this.charSprite.width, this.charSprite.height);
        this.charSprite.setScale(this.charScale);
    }

    newSet() {
        this.voice.stop();
        this.cards.forEach(card => card.destroy());
        this.cards = [];
        this.firstPick = null;
        this.matchedPairs = 0;
        this.mismatchesThisSet = 0;
        this.flipsSinceMatch = 0;
        this.setWord('');
        this.setCharEmotion('neutral');
        const cfg = MEMORY_LEVELS[this.level];
        const count = cfg.guided ? cfg.boards[this.boardIndex] : cfg.cards;
        this.totalPairs = count / 2;
        const chosen = Phaser.Utils.Array.Shuffle([...ITEMS]).slice(0, this.totalPairs);
        this.layoutDeck(Phaser.Utils.Array.Shuffle(chosen.flatMap(item => [item, item])));
        if (cfg.guided) {
            this.cards.forEach(card => card.reveal());
            this.locked = false;
            this.voice.play(null, PHRASES.memory.guided);
        } else if (cfg.preview) {
            this.locked = true;
            this.cards.forEach(card => card.reveal());
            this.voice.play(null, PHRASES.memory.look);
            this.flipUnmatchedDown(2000, () => {
                this.locked = false;
                this.voice.play(null, PHRASES.memory.find);
            });
        } else {
            this.locked = false;
            this.voice.play(null, PHRASES.memory.find);
        }
    }

    layoutDeck(deck) {
        const rows = deck.length / 2;
        const gap = this.W * 0.035;
        const size = Math.min(this.W * 0.34, (this.H * 0.58 - (rows - 1) * gap) / rows);
        const gridH = rows * size + (rows - 1) * gap;
        const startY = this.H * 0.50 - gridH / 2 + size / 2;
        deck.forEach((item, i) => {
            const x = this.W / 2 + (i % 2 ? 1 : -1) * (size + gap) / 2;
            const y = startY + Math.floor(i / 2) * (size + gap);
            this.cards.push(new MemoryCard(this, item, x, y, size, card => this.onCardTap(card)));
        });
    }

    onCardTap(card) {
        if (this.locked || this._navigationOpen || card.matched || card.flipping) return;
        if (MEMORY_LEVELS[this.level].guided) this.tapGuided(card);
        else this.tapMemory(card);
    }

    tapGuided(card) {
        if (!this.firstPick) {
            this.firstPick = card;
            card.highlight();
            this.setWord(card.item.name);
            this.voice.play(PHRASES.tidyName[card.item.id], card.item.name, () => {
                if (this.firstPick === card && !this.locked) {
                    this.voice.play(null, PHRASES.memory.other(card.item.name));
                }
            });
        } else if (card !== this.firstPick && card.item.id === this.firstPick.item.id) {
            const first = this.firstPick;
            this.firstPick = null;
            this.onPairMatched(first, card);
        }
        // A different picture gives no negative feedback and keeps the selection.
    }

    tapMemory(card) {
        if (card.faceUp) return;
        card.flip(true);
        this.setWord(card.item.name);
        this.flipsSinceMatch++;
        if (!this.firstPick) {
            this.firstPick = card;
            this.voice.play(null, PHRASES.memory.other(card.item.name));
            return;
        }
        this.locked = true;
        const first = this.firstPick;
        this.firstPick = null;
        this.time.delayedCall(350, () => {
            if (first.item.id === card.item.id) this.onPairMatched(first, card);
            else {
                this.mismatchesThisSet++;
                if (this.flipsSinceMatch >= 4) this.takeAPeek();
                else {
                    card.flip(false, null, 800);
                    first.flip(false, () => { this.setWord(''); this.locked = false; }, 800);
                }
            }
        });
    }

    flipUnmatchedDown(delay, onDone) {
        const unmatched = this.cards.filter(card => !card.matched);
        let pending = unmatched.length;
        unmatched.forEach(card => card.flip(false, () => { if (--pending === 0) onDone(); }, delay));
    }

    takeAPeek() {
        this.locked = true;
        this.flipsSinceMatch = 0;
        this.firstPick = null;
        this.setWord('');
        this.voice.play(null, PHRASES.memory.peek);
        this.cards.filter(card => !card.matched && !card.faceUp).forEach(card => card.flip(true));
        this.flipUnmatchedDown(1320, () => { this.locked = false; });
    }

    onPairMatched(a, b) {
        this.locked = true;
        this.matchedPairs++;
        this.flipsSinceMatch = 0;
        this.setWord(b.item.name);
        this.setCharEmotion('jumping');
        let audioDone = false, animDone = false;
        const finish = () => {
            if (!audioDone || !animDone || !this.sys.isActive()) return;
            if (this.matchedPairs === this.totalPairs) this.onSetComplete();
            else {
                this.firstPick = null;
                this.setWord('');
                this.setCharEmotion('neutral');
                this.locked = false;
            }
        };
        this.voice.play(PHRASES.tidyName[b.item.id], b.item.name, () => {
            this.playPraise(() => { audioDone = true; finish(); });
        });
        const grow = Math.min(1.35, this.W * 0.40 / a.size);
        const dx = a.size * grow * 0.56;
        a.growTo(this.W / 2 - dx, this.H * 0.50, grow);
        b.growTo(this.W / 2 + dx, this.H * 0.50, grow, () => this.starBurst(this.W / 2, this.H * 0.50));
        const slot = this.collectedSlot(this.matchedPairs - 1, a.size);
        let pending = 2;
        const onSpun = () => { if (--pending === 0) { animDone = true; finish(); } };
        a.spinTo(slot.ax, slot.y, slot.scale, onSpun, 1000);
        b.spinTo(slot.bx, slot.y, slot.scale, onSpun, 1000);
    }

    collectedSlot(index, size) {
        const x = this.W * 0.44 + index * this.W * 0.19;
        return { ax: x - this.W * 0.022, bx: x + this.W * 0.022, y: this.H * 0.90, scale: this.W * 0.125 / size };
    }

    playPraise(onEnd) {
        // Use both recordings in each short game, rather than repeating one line.
        const clip = PHRASES.memoryPraise[this._praiseIndex++ % PHRASES.memoryPraise.length];
        this.voice.play(clip.key, clip.text, onEnd);
    }

    onSetComplete() {
        this.locked = true;
        this.setWord('');
        this.setCharEmotion('happy');
        let audioDone = false, animDone = false;
        const finish = () => {
            if (!audioDone || !animDone || !this.sys.isActive()) return;
            if (this.mode === 'mini') {
                this.miniSetsCleared++;
                if (this.miniSetsCleared < MEMORY_MINI_SETS) {
                    this.newSet();
                    return;
                }
                this.setCharEmotion('sleepy');
                this.voice.play(Phaser.Utils.Array.GetRandom(PHRASES.sleepy), "I'm sleepy.", () => {
                    this.time.delayedCall(700, () => this.scene.start('PlayScene', {
                        characterId: this.characterId, fromMinigame: true,
                    }));
                });
            } else {
                Object.assign(this, advanceMemoryProgress(this.level, this.boardIndex, this.setsCleared, this.mismatchesThisSet));
                localStorage.setItem('tcm_memory_level', String(this.level));
                this.newSet();
            }
        };
        this.playPraise(() => { audioDone = true; finish(); });
        const star = this.add.image(this.W / 2, this.H * 0.50, 'memory_star').setDepth(50).setScale(0);
        this.starBurst(star.x, star.y);
        this.tweens.add({
            targets: star, scale: this.W * 0.32 / 64, angle: 360, duration: 650, ease: 'Back.easeOut',
            onComplete: () => {
                this.starBurst(star.x, star.y);
                this.tweens.add({ targets: star, scale: 0, angle: 720, delay: 1100, duration: 450,
                    onComplete: () => { star.destroy(); animDone = true; finish(); } });
            },
        });
    }

    makeStarTexture() {
        if (this.textures.exists('memory_star')) return;
        const points = [];
        for (let i = 0; i < 10; i++) {
            const angle = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 13 : 30;
            points.push({ x: 32 + Math.cos(angle) * r, y: 32 + Math.sin(angle) * r });
        }
        const g = this.make.graphics({ add: false });
        g.fillStyle(0xFFD86A).fillPoints(points, true);
        g.generateTexture('memory_star', 64, 64);
        g.destroy();
    }

    starBurst(x, y) {
        const emitter = this.add.particles(x, y, 'memory_star', {
            speed: { min: 100, max: 350 }, lifespan: 950, gravityY: 250,
            scale: { start: 0.8, end: 0 }, rotate: { min: 0, max: 360 }, emitting: false,
            tint: [0xFFFFFF, 0xFFD86A, 0xFFD3D9, 0xD2ECC8],
        }).setDepth(45);
        emitter.explode(24);
        this.time.delayedCall(1100, () => emitter.destroy());
    }
}

class MemoryCard {
    constructor(scene, item, x, y, size, onTap) {
        this.scene = scene;
        this.item = item;
        this.size = size;
        this.matched = false;
        this.faceUp = false;
        this.flipping = false;
        const shadow = scene.add.graphics();
        shadow.fillStyle(0x9B735B, 0.18).fillRoundedRect(-size / 2 + 3, -size / 2 + 8, size, size, 22);
        this.back = scene.add.graphics();
        this.back.fillStyle(0xB4CAB5).fillRoundedRect(-size / 2, -size / 2, size, size, 22);
        this.back.lineStyle(5, 0xFFF8EC).strokeRoundedRect(-size / 2 + 9, -size / 2 + 9, size - 18, size - 18, 17);
        this.symbol = scene.add.text(0, 0, '♥', { fontFamily: 'Arial, sans-serif', fontSize: `${size * 0.42}px`, color: '#fff8ec' }).setOrigin(0.5);
        const front = scene.add.graphics().setVisible(false);
        front.fillStyle(0xFFF9EF).fillRoundedRect(-size / 2, -size / 2, size, size, 22);
        front.lineStyle(5, 0xD2AA83).strokeRoundedRect(-size / 2, -size / 2, size, size, 22);
        let picture;
        if (scene.textures.exists(item.image)) {
            picture = scene.add.image(0, 0, item.image).setVisible(false);
            picture.setScale(size * 0.84 / Math.max(picture.width, picture.height));
        } else {
            picture = scene.add.text(0, 0, item.name, { fontFamily: 'Quicksand', fontSize: `${size * 0.15}px`, color: '#5a4632' }).setOrigin(0.5).setVisible(false);
        }
        this.frontParts = [front, picture];
        this.visual = scene.add.container(x, y, [shadow, this.back, this.symbol, ...this.frontParts]).setDepth(10);
        this.hit = scene.add.zone(x, y, size, size).setDepth(12).setInteractive({ useHandCursor: true });
        this.hit.on('pointerdown', () => onTap(this));
    }

    showFace(front) {
        this.faceUp = front;
        this.back.setVisible(!front);
        this.symbol.setVisible(!front);
        this.frontParts.forEach(part => part.setVisible(front));
    }

    flip(front, onDone, delay = 0) {
        // Mark immediately so a rapid repeat tap cannot pick the same card twice.
        if (!delay) this.flipping = true;
        this.scene.tweens.add({ targets: this.visual, scaleX: 0, delay, duration: 130, ease: 'Quad.easeIn',
            onStart: () => { this.flipping = true; },
            onComplete: () => {
                this.showFace(front);
                this.scene.tweens.add({ targets: this.visual, scaleX: 1, duration: 130, ease: 'Quad.easeOut',
                    onComplete: () => { this.flipping = false; if (onDone) onDone(); } });
            } });
    }

    reveal() { this.showFace(true); this.visual.setScale(1); }

    highlight() {
        this.visual.setDepth(15);
        this.scene.tweens.add({ targets: this.visual, scale: 1.12, duration: 180, ease: 'Back.easeOut' });
    }

    growTo(x, y, scale, onDone) {
        this.matched = true;
        this.hit.disableInteractive();
        this.scene.tweens.killTweensOf(this.visual);
        // On a slow frame, matching can finish before the flip tween does.
        this.flipping = false;
        this.showFace(true);
        this.visual.setDepth(30);
        this.scene.tweens.add({ targets: this.visual, x, y, scale, duration: 350, ease: 'Back.easeOut', onComplete: onDone });
    }

    spinTo(x, y, scale, onDone, delay) {
        this.scene.tweens.add({ targets: this.visual, x, y, scale, angle: '+=360', delay, duration: 550, ease: 'Cubic.easeInOut',
            onComplete: () => { this.visual.setDepth(8); onDone(); } });
    }

    destroy() {
        this.scene.tweens.killTweensOf(this.visual);
        this.visual.destroy(true);
        this.hit.destroy();
    }
}
