// Every screen except Home shares this parent navigation: hold for two seconds.
function addDoorButton(scene) {
    const W = scene.scale.width, H = scene.scale.height;
    const x = W - 50, y = 50;
    const icon = scene.add.graphics().setDepth(80);
    icon.fillStyle(0xFFFFFF, 0.18).fillRoundedRect(x - 18, y - 25, 36, 50, 5);
    icon.lineStyle(2.5, 0xFFFFFF, 0.65).strokeRoundedRect(x - 18, y - 25, 36, 50, 5);
    icon.fillStyle(0xFFFFFF, 0.8).fillCircle(x - 8, y + 3, 3.5);
    const zone = scene.add.zone(x, y, 100, 100).setDepth(81).setInteractive();
    let arc = null, hold = null, pointerId = null, menu = null;
    let previousTimePaused = false, previousPhysicsPaused = false;
    scene._navigationOpen = false;

    const cancelHold = () => {
        if (hold) { hold.stop(); hold = null; }
        if (arc) { arc.destroy(); arc = null; }
        pointerId = null;
    };
    const closeMenu = () => {
        if (!menu) return;
        menu.destroy(true);
        menu = null;
        scene._navigationOpen = false;
        scene.time.paused = previousTimePaused;
        if (scene.physics && !previousPhysicsPaused) scene.physics.world.resume();
    };
    const openMenu = () => {
        if (menu) return;
        scene._navigationOpen = true;
        previousTimePaused = scene.time.paused;
        scene.time.paused = true; // Mini-games cannot auto-end beneath the menu.
        if (scene.physics) {
            previousPhysicsPaused = scene.physics.world.isPaused;
            scene.physics.world.pause();
        }
        menu = scene.add.container(0, 0).setDepth(200);
        const backdrop = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.55).setInteractive();
        backdrop.on('pointerdown', closeMenu);
        const choices = [
            { label: 'Back to Care Game', scene: 'PlayScene' },
            { label: 'Back to Home', scene: 'SelectScene' },
        ].filter(choice => choice.scene !== scene.sys.settings.key);
        const panelW = W * 0.88;
        const buttonH = Math.min(H * 0.09, W * 0.17), gap = H * 0.018;
        const panelH = H * 0.12 + choices.length * (buttonH + gap) + H * 0.04;
        const top = (H - panelH) / 2;
        const panel = scene.add.graphics();
        panel.fillStyle(0xF2E4D4).fillRoundedRect((W - panelW) / 2, top, panelW, panelH, 28);
        const shield = scene.add.zone(W / 2, top + panelH / 2, panelW, panelH).setInteractive();
        const title = scene.add.text(W / 2, top + H * 0.055, 'Where to?', {
            fontFamily: 'Quicksand, Arial, sans-serif', fontSize: `${W * 0.064}px`, color: '#5a4632',
        }).setOrigin(0.5);
        menu.add([backdrop, panel, shield, title]);
        choices.forEach((choice, i) => {
            const cy = top + H * 0.12 + buttonH / 2 + i * (buttonH + gap);
            const buttonW = panelW * 0.9;
            const bg = scene.add.graphics();
            bg.fillStyle(0xE08D5A).fillRoundedRect((W - buttonW) / 2, cy - buttonH / 2, buttonW, buttonH, 20);
            const text = scene.add.text(W / 2, cy, choice.label, {
                fontFamily: 'Quicksand, Arial, sans-serif', fontSize: `${W * 0.043}px`, color: '#ffffff',
            }).setOrigin(0.5);
            const hit = scene.add.zone(W / 2, cy, buttonW, buttonH).setInteractive({ useHandCursor: true });
            hit.on('pointerdown', () => {
                const characterId = scene.characterId || localStorage.getItem('tcm_character') || 'dolly';
                closeMenu();
                scene.scene.start(choice.scene, { characterId, fromMinigame: true });
            });
            menu.add([bg, text, hit]);
        });
    };
    zone.on('pointerdown', pointer => {
        if (menu || pointerId !== null) return;
        pointerId = pointer.id;
        arc = scene.add.graphics().setDepth(82);
        const progress = { t: 0 };
        hold = scene.tweens.add({
            targets: progress, t: 1, duration: 2000,
            onUpdate: () => {
                arc.clear().lineStyle(4, 0xFFFFFF, 0.75).beginPath();
                arc.arc(x, y, 26, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress.t);
                arc.strokePath();
            },
            onComplete: () => { cancelHold(); openMenu(); },
        });
    });
    const release = pointer => { if (pointer.id === pointerId) cancelHold(); };
    const move = pointer => {
        if (pointer.id === pointerId && (Math.abs(pointer.x - x) > 50 || Math.abs(pointer.y - y) > 50)) cancelHold();
    };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    scene.input.on('pointermove', move);
    scene.events.once('shutdown', () => {
        cancelHold();
        closeMenu();
        scene.input.off('pointerup', release);
        scene.input.off('pointerupoutside', release);
        scene.input.off('pointermove', move);
    });
}
