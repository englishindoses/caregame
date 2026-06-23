const config = {
    type: Phaser.AUTO,
    backgroundColor: '#F2E4D4',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280,
    },
    scene: [BootScene, SelectScene, PlayScene]
};

new Phaser.Game(config);
