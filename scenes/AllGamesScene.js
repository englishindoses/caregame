class AllGamesScene extends Phaser.Scene {
    constructor() { super('AllGamesScene'); }

    init(data) {
        this.characterId = data.characterId || localStorage.getItem('tcm_character') || 'dolly';
        this.sound.mute = localStorage.getItem('tcm_mute') === '1';
    }

    create() {
        addMuteButton(this);
        const W = this.scale.width, H = this.scale.height;
        this._launching = false;
        this.voice = createSceneVoice(this);
        this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        this.add.text(W * 0.55, H * 0.10, 'What shall\nwe play?', {
            fontFamily: 'Arial, sans-serif', fontSize: `${W * 0.089}px`, color: '#ffffff',
            stroke: '#000000', strokeThickness: 8, align: 'center', wordWrap: { width: W - 80 },
        }).setOrigin(0.5);
        this.charSprite = this.add.image(W * 0.20, H * 0.82, `${this.characterId}_happy`);
        this.resizeCharacter();
        this.tweens.add({ targets: this.charSprite, y: H * 0.82 - 12, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        addCharacterSwitcher(this, () => { this.charSprite.setTexture(`${this.characterId}_happy`); this.resizeCharacter(); });
        addDoorButton(this);
        makeMemoryTileTexture(this);
        const cols = ALL_GAMES.length === 1 ? 1 : 2;
        const size = Math.min(W * 0.42, H * 0.26);
        ALL_GAMES.forEach((game, i) => {
            const x = cols === 1 ? W / 2 : W * (i % 2 ? 0.75 : 0.25);
            const y = H * 0.42 + Math.floor(i / cols) * (size + H * 0.06);
            const tile = this.add.image(x, y, game.image).setDisplaySize(size, size).setInteractive({ useHandCursor: true });
            const base = tile.scaleX;
            this.add.text(x, y + size * 0.48, game.name, {
                fontFamily: 'Quicksand, Arial, sans-serif', fontSize: `${W * 0.067}px`, color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 5,
            }).setOrigin(0.5);
            this.tweens.add({ targets: tile, scale: base * 1.05, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
            tile.on('pointerdown', () => {
                if (this._launching || this._navigationOpen) return;
                this._launching = true;
                this.tweens.killTweensOf(tile);
                this.voice.play(null, game.chosenText, () => this.time.delayedCall(0, () => this.scene.start(game.scene, { characterId: this.characterId, mode: game.mode })));
            });
        });
    }

    resizeCharacter() {
        this.charSprite.setScale(Math.min(this.scale.width * 0.32, this.scale.height * 0.22) / Math.max(this.charSprite.width, this.charSprite.height));
    }
}
