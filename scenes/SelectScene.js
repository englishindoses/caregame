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
        this.add.rectangle(W / 2, H / 2, W, H, 0xF6EDE0);
        this.add.rectangle(W / 2, H * 0.93, W, H * 0.14, 0xEDE0CD);
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
        const careX = W * 0.08, careY = H * 0.125, careW = W * 0.84, careH = H * 0.13;
        const care = this.add.graphics();
        care.fillStyle(0x8B775C, 0.12).fillRoundedRect(careX, careY + 8, careW, careH, 24);
        care.fillStyle(0xE7EDDA).fillRoundedRect(careX, careY, careW, careH, 24);
        care.lineStyle(3, 0xBDCCA7).strokeRoundedRect(careX, careY, careW, careH, 24);
        this.carePicture = this.add.image(W * 0.22, careY + careH / 2, `${this.characterId}_happy`);
        this.resizeCarePicture();
        this.add.text(W * 0.59, careY + careH / 2, 'Care Game', { fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.064}px`, color: '#5a4938' }).setOrigin(0.5);
        this.add.zone(W / 2, careY + careH / 2, careW, careH).setInteractive({ useHandCursor: true }).on('pointerdown', () => launch('PlayScene'));
        const shelfX = W * 0.06, shelfY = H * 0.30, shelfW = W * 0.88, shelfH = H * 0.45;
        const wood = W * 0.025;
        const cellW = (shelfW - wood * 3) / 2, cellH = (shelfH - wood * 3) / 2;
        const shelf = this.add.graphics();
        shelf.fillStyle(0x8B775C, 0.13).fillRoundedRect(shelfX + 5, shelfY + 12, shelfW, shelfH, 16);
        shelf.fillStyle(0xCCA47B).fillRoundedRect(shelfX, shelfY, shelfW, shelfH, 16);
        shelf.lineStyle(3, 0xE5C3A0).strokeRoundedRect(shelfX + 3, shelfY + 3, shelfW - 6, shelfH - 6, 13);
        [shelfX + wood, shelfX + shelfW - wood * 2].forEach(x => {
            shelf.fillStyle(0xB78E66).fillRoundedRect(x, shelfY + shelfH - 2, wood, H * 0.016, 4);
        });
        this.gameTiles = [];
        ALL_GAMES.forEach((game, i) => {
            const left = shelfX + wood + (i % 2) * (cellW + wood);
            const top = shelfY + wood + Math.floor(i / 2) * (cellH + wood);
            const x = left + cellW / 2, y = top + cellH * 0.39;
            shelf.fillStyle(i < 2 ? 0xFAF3E7 : 0xF5EBDC).fillRoundedRect(left, top, cellW, cellH, 7);
            shelf.fillStyle(0x9C7957, 0.10).fillRoundedRect(left, top, cellW, H * 0.016, 7);
            const size = Math.min(cellW * 0.70, cellH * 0.70);
            const tile = this.add.image(x, y, game.image).setDepth(1);
            tile.setScale(size / Math.max(tile.width, tile.height));
            const base = tile.scaleX;
            this.tweens.add({ targets: tile, scale: base * 1.03, duration: 1500, yoyo: true, repeat: -1 });
            const label = this.add.text(x, top + cellH * 0.86, game.name, {
                fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.051}px`, color: '#64513D',
            }).setOrigin(0.5).setDepth(1);
            const hit = this.add.zone(x, top + cellH / 2, cellW, cellH).setDepth(2).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => launch(game.scene, 'full'));
            this.gameTiles.push({ id: game.id, tile, label, hit });
        });
        this.plushieLabel = this.add.text(W / 2, H * 0.78, '', { fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.045}px`, color: '#64513D' }).setOrigin(0.5);
        this.add.text(W * 0.27, H * 0.819, 'Choose a friend', { fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.031}px`, color: '#7E6C54' }).setOrigin(0.5);
        this.add.text(W * 0.73, H * 0.819, 'Ready to play', { fontFamily: 'Quicksand, Arial', fontSize: `${W * 0.031}px`, color: '#7E6C54' }).setOrigin(0.5);
        const friendsShelf = this.add.graphics();
        friendsShelf.fillStyle(0x8B775C, 0.15).fillRoundedRect(W * 0.055, H * 0.944, W * 0.43, H * 0.017, 5);
        friendsShelf.fillStyle(0xCCA47B).fillRoundedRect(W * 0.05, H * 0.935, W * 0.43, H * 0.014, 5);
        friendsShelf.lineStyle(2, 0xE5C3A0).lineBetween(W * 0.055, H * 0.936, W * 0.475, H * 0.936);
        this.add.ellipse(W * 0.73, H * 0.976, W * 0.27, H * 0.023, 0xBFA98C, 0.25);
        this.plushieChoices = CHARACTERS.map(char => {
            const picture = this.add.image(0, 0, char.happy);
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
        this.carePicture.setScale(Math.min(this.scale.width * 0.19, this.scale.height * 0.105) / Math.max(this.carePicture.width, this.carePicture.height));
    }

    updatePlushie() {
        this.carePicture.setTexture(`${this.characterId}_happy`);
        this.resizeCarePicture();
        const character = CHARACTERS.find(char => char.id === this.characterId);
        this.plushieLabel.setText(`Play with ${character.name}`);
        const W = this.scale.width, H = this.scale.height;
        let shelfIndex = 0;
        this.plushieChoices.forEach(({ id, picture, hit }) => {
            const selected = id === this.characterId;
            const size = W * (selected ? 0.255 : 0.145);
            picture.setScale(size / Math.max(picture.width, picture.height));
            const x = selected ? W * 0.73 : W * (0.16 + shelfIndex++ * 0.22);
            const feet = H * (selected ? 0.978 : 0.935);
            picture.setPosition(x, feet - picture.displayHeight / 2);
            hit.setPosition(x, picture.y);
            hit.setSize(W * (selected ? 0.29 : 0.20), Math.max(H * 0.10, picture.displayHeight));
        });
    }
}
