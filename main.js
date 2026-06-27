const config = {
    type: Phaser.AUTO,
    backgroundColor: '#F2E4D4',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: 720,
        height: 1280,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false },
    },
    scene: [BootScene, SelectScene, PlayScene, MiniGameSelectScene, CatchScene]
};

new Phaser.Game(config);
