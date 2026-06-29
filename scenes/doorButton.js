// Shared "exit" door button — a small semi-transparent door in the top-right
// corner. Hold for 2 seconds (a subtle arc draws during the hold) to clear the
// saved character and return to the character-select screen. Same behaviour and
// look as the door button in the main game (PlayScene), reused by the
// mini-game scenes so they can be exited the same way.
function addDoorButton(scene) {
    const W  = scene.scale.width;
    const ZX = W - 50;
    const ZY = 50;

    const dW = 36, dH = 50;
    const dX = ZX - dW / 2;
    const dY = ZY - dH / 2;

    const icon = scene.add.graphics().setDepth(50);
    icon.fillStyle(0xFFFFFF, 0.18);
    icon.fillRoundedRect(dX, dY, dW, dH, 5);
    icon.lineStyle(2.5, 0xFFFFFF, 0.65);
    icon.strokeRoundedRect(dX, dY, dW, dH, 5);
    icon.fillStyle(0xFFFFFF, 0.8);
    icon.fillCircle(ZX - 8, ZY + 3, 3.5);   // doorknob

    const zone = scene.add.zone(ZX, ZY, 100, 100).setDepth(51).setInteractive();

    let arcGfx = null, arcObj = null, arcTween = null;

    const cancelHold = () => {
        if (arcTween) { arcTween.stop();  arcTween = null; }
        if (arcGfx)   { arcGfx.destroy(); arcGfx = null; }
        arcObj = null;
    };

    zone.on('pointerdown', () => {
        arcObj = { t: 0 };
        arcGfx = scene.add.graphics().setDepth(52);
        arcTween = scene.tweens.add({
            targets:  arcObj,
            t:        1,
            duration: 2000,
            ease:     'Linear',
            onUpdate: () => {
                arcGfx.clear();
                arcGfx.lineStyle(4, 0xFFFFFF, 0.75);
                arcGfx.beginPath();
                arcGfx.arc(ZX, ZY, 26, -Math.PI / 2,
                    -Math.PI / 2 + Math.PI * 2 * arcObj.t, false);
                arcGfx.strokePath();
            },
            onComplete: () => {
                scene.input.off('pointerup', cancelHold);
                arcGfx.destroy(); arcGfx = null;
                arcTween = null;
                localStorage.removeItem('tcm_character');
                scene.scene.start('SelectScene');
            },
        });
        scene.input.once('pointerup', cancelHold);
    });
}
