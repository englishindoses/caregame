class SelectScene extends Phaser.Scene {
    constructor() {
        super('SelectScene');
    }

    create() {
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
