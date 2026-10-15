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
        this.add.image(W / 2, H / 2, 'bg_home').setDisplaySize(W, H);
        addMuteButton(this, { x: 50, y: H * 0.055 });
        addParentSettings(this);
        this.add.text(W / 2, H * 0.055, 'Home', {
            fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.067}px`, color: '#64513D',
        }).setOrigin(0.5);
        makeMemoryTileTexture(this);
        const launch = (destination, mode) => {
            if (this._launching || this._settingsOpen) return;
            this._launching = true;
            this.scene.start(destination, { characterId: this.characterId, mode, fromSelect: destination === 'PlayScene' });
        };
        // Positions follow the photographed shelf, expressed as canvas fractions.
        this.carePicture = this.add.image(W * 0.5, H * 0.187, `${this.characterId}_neutral`);
        this.resizeCarePicture();
        this.add.text(W * 0.5, H * 0.264, 'Care Game', {
            fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.052}px`, color: '#59402A',
            stroke: '#F9E5C6', strokeThickness: 3,
        }).setOrigin(0.5);
        this.add.zone(W * 0.5, H * 0.20, W * 0.48, H * 0.16)
            .setInteractive({ useHandCursor: true }).on('pointerdown', () => launch('PlayScene'));
        this.gameTiles = [];
        ALL_GAMES.forEach((game, i) => {
            const left = W * (i % 2 ? 0.51 : 0.17);
            const top = H * (i < 2 ? 0.285 : 0.47);
            const cellW = W * 0.31, cellH = H * (i < 2 ? 0.17 : 0.158);
            const x = left + cellW / 2, y = H * (i < 2 ? 0.351 : 0.53);
            // Trim transparent margins for Home only, so the actual toy fills its cubby.
            const content = {
                memory: [28, 58, 248, 188], catch: [3, 3, 232, 232],
                tidy: [5, 43, 222, 167], car: [6, 31, 227, 168],
            }[game.id];
            const texture = this.textures.get(game.image);
            if (!texture.has('home_content')) texture.add('home_content', 0, ...content);
            const tile = this.add.image(x, y, game.image, 'home_content').setDepth(1);
            tile.setScale(Math.min(cellW * 0.91 / tile.width, H * (i < 2 ? 0.115 : 0.114) / tile.height));
            const base = tile.scaleX;
            this.tweens.add({ targets: tile, scale: base * 1.03, duration: 1500, yoyo: true, repeat: -1 });
            const label = this.add.text(x, H * (i < 2 ? 0.433 : 0.61), game.name, {
                fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.036}px`, color: '#64513D',
            }).setOrigin(0.5).setDepth(1);
            const hit = this.add.zone(x, top + cellH / 2, cellW, cellH).setDepth(2).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => launch(game.scene, 'full'));
            this.gameTiles.push({ id: game.id, tile, label, hit });
        });
        this.plushieLabel = this.add.text(W / 2, H * 0.982, '', {
            fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.043}px`, color: '#64513D',
            stroke: '#FFF4DE', strokeThickness: 4,
        }).setOrigin(0.5);
        this.plushieChoices = CHARACTERS.map(char => {
            const picture = this.add.image(0, 0, char.neutral);
            const hit = this.add.zone(0, 0, W * 0.20, H * 0.12).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                if (this._settingsOpen || this._launching) return;
                if (char.id === this.characterId) return;
                this.characterId = char.id;
                localStorage.setItem('tcm_character', char.id);
                this.updatePlushie();
            });
            return { id: char.id, picture, hit };
        });
        this.updatePlushie();
    }

    resizeCarePicture() {
        this.carePicture.setScale(Math.min(this.scale.width * 0.24, this.scale.height * 0.112) / Math.max(this.carePicture.width, this.carePicture.height));
    }

    updatePlushie() {
        this.carePicture.setTexture(`${this.characterId}_neutral`);
        this.resizeCarePicture();
        const character = CHARACTERS.find(char => char.id === this.characterId);
        this.plushieLabel.setText(`Play with ${character.name}`);
        const W = this.scale.width, H = this.scale.height;
        this.plushieChoices.forEach(({ id, picture, hit }, index) => {
            const selected = id === this.characterId;
            picture.setTexture(`${id}_${selected ? 'neutral' : 'sleeping'}`);
            const size = W * (selected ? 0.46 : 0.37);
            picture.setScale(size / Math.max(picture.width, picture.height));
            const x = W * (index === 1 ? 0.5 : index === 0 ? (selected ? 0.23 : 0.185) : (selected ? 0.77 : 0.815));
            const feet = H * 0.94;
            picture.setPosition(x, feet - picture.displayHeight / 2).setDepth(selected ? 4 : 3);
            hit.setPosition(x, picture.y).setDepth(selected ? 6 : 5);
            hit.setSize(W * 0.31, Math.max(H * 0.10, picture.displayHeight));
        });
    }
}
