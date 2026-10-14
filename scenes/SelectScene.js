// Home is the activity hub; choosing a plushie does not start an activity.
class SelectScene extends Phaser.Scene {
    constructor() { super('SelectScene'); }

    init(data) {
        this.characterId = data.characterId || localStorage.getItem('tcm_character') || 'dolly';
        this._settingsOpen = false;
    }

    preload() {
        if (!this.textures.exists('toy_box_closed')) this.load.image('toy_box_closed', 'assets/images/toy_box_closed.png');
    }

    create() {
        const W = this.scale.width, H = this.scale.height;
        this._launching = false;
        this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        addMuteButton(this, { x: 50, y: H * 0.055 });
        addParentSettings(this);
        this.add.text(W / 2, H * 0.055, 'Home', {
            fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.075}px`, color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 5,
        }).setOrigin(0.5);
        makeMemoryTileTexture(this);
        const launch = (destination, mode) => {
            if (this._launching || this._settingsOpen) return;
            this._launching = true;
            this.scene.start(destination, { characterId: this.characterId, mode, fromSelect: destination === 'PlayScene' });
        };
        const care = this.add.rectangle(W / 2, H * 0.19, W * 0.84, H * 0.12, 0xF0F4E6).setStrokeStyle(4, 0xC1D0A8);
        this.carePicture = this.add.image(W * 0.23, H * 0.19, `${this.characterId}_happy`);
        this.resizeCarePicture();
        this.add.text(W * 0.57, H * 0.19, 'Care', { fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.075}px`, color: '#5a4938' }).setOrigin(0.5);
        this.add.zone(care.x, care.y, care.width, care.height).setInteractive({ useHandCursor: true }).on('pointerdown', () => launch('PlayScene'));
        ALL_GAMES.forEach((game, i) => {
            const x = W * (i % 2 ? 0.75 : 0.25), y = H * (0.40 + Math.floor(i / 2) * 0.25);
            const size = Math.min(W * 0.30, H * 0.17);
            const tile = this.add.image(x, y, game.image);
            tile.setScale(size / Math.max(tile.width, tile.height));
            const base = tile.scaleX;
            this.tweens.add({ targets: tile, scale: base * 1.04, duration: 1500, yoyo: true, repeat: -1 });
            this.add.text(x, y + size * 0.70, game.name, {
                fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.054}px`, color: '#ffffff', stroke: '#5a3a2a', strokeThickness: 5,
            }).setOrigin(0.5);
            // The picture, label and intervening space all respond to a tap.
            this.add.zone(x, y + size * 0.17, W * 0.44, size * 1.55).setInteractive({ useHandCursor: true }).on('pointerdown', () => launch(game.scene, 'full'));
        });
        this.plushieLabel = this.add.text(W / 2, H * 0.83, '', { fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.048}px`, color: '#5a4938', stroke: '#fff8ec', strokeThickness: 3 }).setOrigin(0.5);
        this.selectionRings = [];
        CHARACTERS.forEach((char, i) => {
            const x = W * (0.25 + i * 0.25), y = H * 0.92, size = W * 0.17;
            const ring = this.add.circle(x, y, size * 0.57, 0xFFF8EC, 0.8);
            this.selectionRings.push({ ring, id: char.id });
            const picture = this.add.image(x, y, char.happy);
            picture.setScale(size / Math.max(picture.width, picture.height));
            this.add.zone(x, y, W * 0.22, H * 0.12).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
                if (this._settingsOpen || this._launching) return;
                this.characterId = char.id;
                localStorage.setItem('tcm_character', char.id);
                this.updatePlushie();
            });
        });
        this.updatePlushie();
    }

    resizeCarePicture() {
        this.carePicture.setScale(Math.min(this.scale.width * 0.19, this.scale.height * 0.105) / Math.max(this.carePicture.width, this.carePicture.height));
    }

    updatePlushie() {
        this.carePicture.setTexture(`${this.characterId}_happy`);
        this.resizeCarePicture();
        const character = CHARACTERS.find(char => char.id === this.characterId);
        this.plushieLabel.setText(`Play with ${character.name}`);
        this.selectionRings.forEach(({ ring, id }) => ring.setStrokeStyle(id === this.characterId ? 5 : 0, 0x72865B));
    }
}
