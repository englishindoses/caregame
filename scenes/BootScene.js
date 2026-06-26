class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        const W = this.scale.width;
        const H = this.scale.height;

        const barBg = this.add.rectangle(W / 2, H / 2, W * 0.7, 30, 0xDDBB99);
        const bar   = this.add.rectangle(W / 2 - W * 0.35, H / 2, 0, 30, 0xFF8866);
        bar.setOrigin(0, 0.5);

        this.load.on('progress',    v    => { bar.width = W * 0.7 * v; });
        this.load.on('loaderror',   file => console.warn(`Missing asset: ${file.key}`));

        // Items are PNG except item_apple; everything else (bg + characters) is WebP.
        const webp = new Set(['bg_room', 'item_apple']);
        const img = key => `assets/images/${key}.${webp.has(key) ? 'webp' : 'png'}`;

        this.load.image('bg_room', img('bg_room'));

        // Each character declares its own emotion set in characters.js (the single
        // source of truth). All character images are WebP.
        CHARACTERS.forEach(char => {
            char.emotions.forEach(emotion => {
                const key = `${char.id}_${emotion}`;
                this.load.image(key, `assets/images/${key}.webp`);
            });
        });

        ITEMS.forEach(item => {
            this.load.image(item.image, img(item.image));
            this.load.audio(item.audio, `assets/audio/${item.audio}.mp3`);
        });

        [
            ...PHRASES.thankYou,
            ...PHRASES.thankYouFood,
            ...PHRASES.thankYouComfy,
            ...PHRASES.thankYouToys,
            ...PHRASES.wrong,
            ...PHRASES.sleepy,
        ].forEach(key => {
            this.load.audio(key, `assets/audio/${key}.mp3`);
        });
        this.load.audio(PHRASES.allDone, `assets/audio/${PHRASES.allDone}.mp3`);
        PHRASES.chosen.forEach(key => {
            this.load.audio(key, `assets/audio/${key}.mp3`);
        });
    }

    create() {
        const saved = localStorage.getItem('tcm_character');
        if (saved) {
            this.scene.start('PlayScene', { characterId: saved });
        } else {
            this.scene.start('SelectScene');
        }
    }
}
