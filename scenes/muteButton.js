// One saved mute preference for recorded voice, browser speech and synth effects.
function addMuteButton(scene) {
    let muted = localStorage.getItem('tcm_mute') === '1';
    const applyMute = () => {
        scene.sound.mute = muted;
        // Phaser 3.60 schedules master mute at time zero. Clear old automation
        // so repeated toggles also update the audible output immediately.
        if (scene.sound.masterMuteNode) {
            scene.sound.masterMuteNode.gain.cancelScheduledValues(0);
            scene.sound.masterMuteNode.gain.value = muted ? 0 : 1;
        }
    };
    applyMute();
    const W = scene.scale.width, H = scene.scale.height;
    const x = W - 50, y = H * 0.13, size = Math.max(84, W * 0.115);
    const icon = scene.add.graphics().setDepth(220);
    const redraw = () => {
        icon.clear();
        icon.fillStyle(0xFFF8EC, 0.9).fillCircle(x, y, size * 0.43);
        icon.lineStyle(2, 0xD5B494, 0.85).strokeCircle(x, y, size * 0.43);
        icon.fillStyle(muted ? 0x998878 : 0x5A4938);
        icon.fillRect(x - 20, y - 9, 10, 18);
        icon.fillPoints([
            { x: x - 10, y: y - 9 }, { x: x + 2, y: y - 19 },
            { x: x + 2, y: y + 19 }, { x: x - 10, y: y + 9 },
        ], true);
        icon.lineStyle(4, muted ? 0xB46F63 : 0x5A4938);
        if (muted) {
            icon.beginPath().moveTo(x - 22, y - 23).lineTo(x + 23, y + 23).strokePath();
        } else {
            [15, 23].forEach(r => {
                icon.beginPath().arc(x + 2, y, r, -Math.PI / 3, Math.PI / 3).strokePath();
            });
        }
    };
    const hit = scene.add.zone(x, y, size, size).setDepth(221).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (_pointer, _localX, _localY, event) => {
        // A mute tap must not also dismiss Tidy's tap-to-continue name reveal.
        if (event) event.stopPropagation();
        // Web Audio gain changes may apply on the next audio tick. Save the
        // intended state instead of reading the manager's delayed getter back.
        muted = !muted;
        applyMute();
        localStorage.setItem('tcm_mute', muted ? '1' : '0');
        if (muted) muteSpeech();
        redraw();
    });
    redraw();
}
