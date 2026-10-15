class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    preload() {
        addMuteButton(this);
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
        this.load.image('bg_home', 'assets/images/bg_home.webp');
        this.load.image('exit_door', 'assets/images/exit_door.png');

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

        // Main-game voice only. Mini-game assets are NOT loaded here — each
        // mini-game scene loads its own in its preload() (and the mini-game
        // select screen loads its tile art + "let's play" lines), so boot stays
        // lean and only pays for what the child actually opens.
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
        const route = () => {
            // Dev shortcut: open index.html?mini to jump straight to the mini-game
            // select screen (skips clearing two trays).
            if (new URLSearchParams(window.location.search).has('mini')) {
                const charId = localStorage.getItem('tcm_character') || 'dolly';
                this.scene.start('MiniGameSelectScene', { characterId: charId });
                return;
            }

            if (new URLSearchParams(window.location.search).has('memory')) {
                this.scene.start('MemoryScene', {
                    characterId: localStorage.getItem('tcm_character') || 'dolly', mode: 'full',
                });
                return;
            }
            this.scene.start('SelectScene');
        };

        // Phaser draws text to a canvas, so the web font must be loaded before any
        // scene renders with it. Wait for it, but never block boot if it fails.
        if (document.fonts && document.fonts.load) {
            document.fonts.load('700 40px "Quicksand"').then(route, route);
        } else {
            route();
        }
    }
}
