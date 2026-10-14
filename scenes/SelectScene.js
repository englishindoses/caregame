class SelectScene extends Phaser.Scene {
    constructor() {
        super('SelectScene');
    }

    preload() {
        if (!this.textures.exists('all_games_icon')) {
            this.load.image('all_games_icon', 'assets/images/all_games_icon.webp');
        }
    }

    create() {
        addMuteButton(this);
        this.input.enabled = true;
        this._openingGames = false;
        const W = this.scale.width;
        const H = this.scale.height;

        if (this.textures.exists('bg_room')) {
            this.add.image(W / 2, H / 2, 'bg_room').setDisplaySize(W, H);
        } else {
            this.add.rectangle(W / 2, H / 2, W, H, 0xF2E4D4);
        }

        this.add.text(W / 2, H * 0.10, 'Who would you like\nto look after?', {
            fontFamily: 'Arial, sans-serif',
            fontSize:   '52px',
            color:      '#5A3A2A',
            align:      'center',
            stroke:     '#ffffff',
            strokeThickness: 4,
        }).setOrigin(0.5);

        const CHAR_SIZE = Math.min(W * 0.42, H * 0.26);
        const positions = [
            { x: W * 0.25, y: H * 0.36 },
            { x: W * 0.75, y: H * 0.36 },
            { x: W * 0.5,  y: H * 0.68 },
        ];

        CHARACTERS.forEach((char, i) => {
            const { x, y: charY } = positions[i];

            let sprite;
            if (this.textures.exists(char.neutral)) {
                sprite = this.add.image(x, charY, char.neutral);
                const scale = CHAR_SIZE / Math.max(sprite.width, sprite.height);
                sprite.setScale(scale);
            } else {
                sprite = this.add.circle(x, charY, CHAR_SIZE / 2, char.color);
            }

            sprite.setInteractive({ useHandCursor: true });

            this.tweens.add({
                targets:  sprite,
                y:        charY - 15,
                duration: 900,
                yoyo:     true,
                repeat:   -1,
                ease:     'Sine.easeInOut',
                delay:    i * 250,
            });

            sprite.on('pointerdown', () => this.choose(sprite, char));
        });
        this.buildAllGamesButton(W, H);
    }

    buildAllGamesButton(W, H) {
        const bx = W / 2, by = H * 0.89, bw = W * 0.86, bh = H * 0.155;
        const radius = bh * 0.25;
        const button = this.add.container(bx, by);
        const panel = this.add.graphics();
        panel.fillStyle(0x6B4D36, 0.17).fillRoundedRect(-bw / 2 + 4, -bh / 2 + 15, bw, bh, radius);
        panel.fillStyle(0x9DAF86).fillRoundedRect(-bw / 2, -bh / 2 + 8, bw, bh, radius);
        panel.fillStyle(0xF0F4E6).fillRoundedRect(-bw / 2, -bh / 2, bw, bh, radius);
        panel.lineStyle(4, 0xC1D0A8).strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, radius);
        panel.lineStyle(3, 0xFFFFFF, 0.8).strokeRoundedRect(-bw / 2 + 8, -bh / 2 + 7, bw - 16, bh - 17, radius - 5);

        const picture = this.add.image(-bw * 0.305, -3, 'all_games_icon');
        // Preserve aspect ratio and use an asset close to its reference display size.
        picture.setScale(Math.min(W * 0.32 / picture.width, bh * 0.92 / picture.height));
        const label = this.add.text(bw * 0.10, -3, 'All Games', {
            fontFamily: 'Quicksand, Arial, sans-serif', fontSize: `${W * 0.075}px`, color: '#4F4935',
        }).setOrigin(0.5);
        const arrowX = bw * 0.425;
        const arrow = this.add.graphics();
        arrow.fillStyle(0xDAE5C6).fillCircle(arrowX, 0, bh * 0.14);
        arrow.lineStyle(5, 0x72865B, 1).beginPath();
        arrow.moveTo(arrowX - 5, -10).lineTo(arrowX + 5, 0).lineTo(arrowX - 5, 10).strokePath();
        button.add([panel, picture, label, arrow]);
        this.add.zone(bx, by, bw, bh).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            if (this._openingGames) return;
            this._openingGames = true;
            this.input.enabled = false;
            this.tweens.add({
                targets: button, scale: 0.97, y: by + 5, duration: 90, yoyo: true, ease: 'Quad.easeOut',
                onComplete: () => this.scene.start('AllGamesScene', {
                    characterId: localStorage.getItem('tcm_character') || 'dolly',
                }),
            });
        });
    }

    choose(sprite, char) {
        this.input.enabled = false;
        this.tweens.killTweensOf(sprite);

        this.tweens.add({
            targets:  sprite,
            scaleX:   (sprite.scaleX || 1) * 1.25,
            scaleY:   (sprite.scaleY || 1) * 1.25,
            duration: 150,
            yoyo:     true,
            ease:     'Back.easeOut',
            onComplete: () => this.scene.start('PlayScene', { characterId: char.id, fromSelect: true }),
        });
    }
}
