// Children tap the door to leave. Full games return Home; care breaks return to care.
function addDoorButton(scene) {
    const W = scene.scale.width, H = scene.scale.height;
    const x = W - 50, y = Math.max(57, H * 0.047);
    const door = scene.add.image(x, y, 'exit_door').setDepth(80);
    door.setScale(Math.min(W * 0.10 / door.width, H * 0.075 / door.height));
    const zone = scene.add.zone(x, y, 100, Math.max(110, H * 0.086))
        .setDepth(81).setInteractive({ useHandCursor: true });
    let leaving = false;
    scene._navigationOpen = false;
    zone.on('pointerdown', (_pointer, _x, _y, event) => {
        event.stopPropagation();
        if (leaving) return;
        leaving = true;
        const characterId = scene.characterId || localStorage.getItem('tcm_character') || 'dolly';
        const mini = scene.mode === 'mini' || scene.sys.settings.key === 'MiniGameSelectScene';
        scene.scene.start(mini ? 'PlayScene' : 'SelectScene', { characterId, fromMinigame: mini });
    });
}
