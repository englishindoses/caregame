// Parent preferences are separate from the quick master-mute button.
function readSoundSettings() {
    const saved = localStorage.getItem('tcm_volume');
    const value = saved === null ? 1 : Number(saved);
    return {
        volume: Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 1,
        requests: localStorage.getItem('tcm_request_sound') !== '0',
        other: localStorage.getItem('tcm_other_sound') !== '0',
    };
}

function soundCategoryEnabled(key) {
    const settings = readSoundSettings();
    return String(key).startsWith('request_') ? settings.requests : settings.other;
}

function setParentSoundMute(sound, muted) {
    sound.setMute(muted);
    // Clear Phaser's gain automation so toggles take effect on this audio tick.
    if (sound.muteNode) {
        sound.muteNode.gain.cancelScheduledValues(0);
        sound.muteNode.gain.value = muted ? 0 : 1;
    }
}

function applySoundSettings(scene) {
    const manager = scene.sound;
    const settings = readSoundSettings();
    if (!manager._parentSettingsInstalled) {
        manager._parentSettingsInstalled = true;
        const add = manager.add.bind(manager);
        manager.add = (key, config = {}) => {
            const sound = add(key, { ...config, mute: !!config.mute || !soundCategoryEnabled(key) });
            sound._parentSoundKey = key;
            const play = sound.play.bind(sound);
            sound.play = (marker, playConfig = {}) => {
                if (typeof marker === 'object') { playConfig = marker; marker = undefined; }
                const muted = !!playConfig.mute || !soundCategoryEnabled(key);
                const result = play(marker, { ...playConfig, mute: muted });
                setParentSoundMute(sound, muted);
                return result;
            };
            setParentSoundMute(sound, !!config.mute || !soundCategoryEnabled(key));
            return sound;
        };
    }
    manager.volume = settings.volume;
    manager.sounds.forEach(sound => {
        // Phaser removes destroyed sounds on its next update; scene shutdown
        // can leave those entries in the manager while Home is being created.
        if (sound._parentSoundKey && !sound.pendingRemove) setParentSoundMute(sound, !soundCategoryEnabled(sound._parentSoundKey));
    });
    if (manager.masterVolumeNode) {
        manager.masterVolumeNode.gain.cancelScheduledValues(0);
        manager.masterVolumeNode.gain.value = settings.volume;
    }
    if (manager._otherSoundNode) manager._otherSoundNode.gain.value = settings.other ? 1 : 0;
    if (!settings.other || settings.volume === 0) muteSpeech();
}

function otherSoundDestination(scene) {
    const manager = scene.sound;
    if (!manager._otherSoundNode) {
        manager._otherSoundNode = manager.context.createGain();
        manager._otherSoundNode.connect(manager.destination || manager.context.destination);
    }
    manager._otherSoundNode.gain.value = readSoundSettings().other ? 1 : 0;
    return manager._otherSoundNode;
}

function addParentSettings(scene) {
    const W = scene.scale.width, H = scene.scale.height;
    const x = W - 50, y = H * 0.055;
    scene.add.circle(x, y, 35, 0xFFF8EC, 0.95).setDepth(220);
    scene.add.text(x, y, '\u2699', { fontFamily: 'Arial', fontSize: '48px', color: '#5a4938' }).setOrigin(0.5).setDepth(220);
    const hit = scene.add.zone(x, y, 90, 90).setInteractive().setDepth(221);
    let hold = null, arc = null, pointerId = null, panel = null;
    const cancel = () => {
        if (hold) hold.stop();
        if (arc) arc.destroy();
        hold = arc = null;
        pointerId = null;
    };
    const open = () => {
        if (panel) return;
        scene._settingsOpen = true;
        panel = scene.add.container(0, 0).setDepth(300);
        const shield = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
        const panelX = W * 0.04, panelY = H * 0.23, panelW = W * 0.92, panelH = H * 0.56;
        const bg = scene.add.graphics();
        bg.fillStyle(0xFFF8EC).fillRoundedRect(panelX, panelY, panelW, panelH, W * 0.04);
        panel.add([shield, bg]);
        const text = (x, y, copy, size = W * 0.042) => {
            const label = scene.add.text(x, y, copy, { fontFamily: 'Quicksand, Arial', fontSize: `${size}px`, color: '#64513D' }).setOrigin(0.5);
            panel.add(label);
            return label;
        };
        const button = (x, y, width, copy, action) => {
            const height = H * 0.066;
            const background = scene.add.graphics();
            panel.add(background);
            const label = text(x, y, copy);
            const zone = scene.add.zone(x, y, width, height).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); action(); });
            panel.add(zone);
            const paint = selected => {
                background.clear();
                background.fillStyle(selected ? 0x72865B : 0xF8F3E9).fillRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
                background.lineStyle(selected ? 3 : 2, selected ? 0x5C7047 : 0xC8BCA9).strokeRoundedRect(x - width / 2, y - height / 2, width, height, height / 2);
                label.setColor(selected ? '#FFF8EC' : '#64513D');
            };
            paint(false);
            return { label, zone, paint };
        };
        text(W / 2, H * 0.29, 'Parent settings', W * 0.058);
        const volume = text(W / 2, H * 0.375, '');
        const sliderLeft = W * 0.15, sliderWidth = W * 0.70, sliderY = H * 0.432;
        const track = scene.add.graphics();
        panel.add(track);
        const thumb = scene.add.circle(0, sliderY, W * 0.028, 0x72865B).setStrokeStyle(4, 0xFFF8EC);
        panel.add(thumb);
        const redrawVolume = () => {
            const value = readSoundSettings().volume;
            volume.setText(`Volume: ${Math.round(value * 100)}%`);
            track.clear();
            track.fillStyle(0xD8CEBD).fillRoundedRect(sliderLeft, sliderY - 6, sliderWidth, 12, 6);
            if (value > 0) track.fillStyle(0x9DAF86).fillRoundedRect(sliderLeft, sliderY - 6, sliderWidth * value, 12, 6);
            thumb.setX(sliderLeft + sliderWidth * value);
        };
        const setVolumeFromX = x => {
            const value = Math.round(Math.max(0, Math.min(1, (x - sliderLeft) / sliderWidth)) * 100) / 100;
            localStorage.setItem('tcm_volume', String(value));
            applySoundSettings(scene);
            redrawVolume();
        };
        const sliderHit = scene.add.zone(W / 2, sliderY, sliderWidth + W * 0.06, H * 0.07).setInteractive({ useHandCursor: true });
        sliderHit.on('pointerdown', (pointer, _x, _y, event) => { event.stopPropagation(); setVolumeFromX(pointer.x); });
        scene.input.setDraggable(sliderHit);
        sliderHit.on('drag', pointer => setVolumeFromX(pointer.x));
        panel.add(sliderHit);
        redrawVolume();
        const options = (key, field, title, y) => {
            text(W * 0.10, y, title, W * 0.037).setOrigin(0, 0.5);
            const select = enabled => {
                localStorage.setItem(key, enabled ? '1' : '0');
                applySoundSettings(scene);
                redraw();
            };
            const on = button(W * 0.665, y, W * 0.14, 'On', () => select(true));
            const off = button(W * 0.825, y, W * 0.14, 'Off', () => select(false));
            const redraw = () => {
                on.paint(readSoundSettings()[field]);
                off.paint(!readSoundSettings()[field]);
            };
            redraw();
        };
        options('tcm_request_sound', 'requests', 'Dolly request sound', H * 0.52);
        options('tcm_other_sound', 'other', 'Other sounds', H * 0.61);
        const done = button(W / 2, H * 0.72, W * 0.65, 'Done', () => {
            panel.destroy(true);
            panel = null;
            scene._settingsOpen = false;
        });
        done.paint(true);
    };
    hit.on('pointerdown', pointer => {
        if (panel || pointerId !== null) return;
        pointerId = pointer.id;
        arc = scene.add.graphics().setDepth(222);
        const progress = { value: 0 };
        hold = scene.tweens.add({ targets: progress, value: 1, duration: 2000,
            onUpdate: () => arc.clear().lineStyle(4, 0x72865B).beginPath().arc(x, y, 41, -Math.PI / 2, -Math.PI / 2 + progress.value * Math.PI * 2).strokePath(),
            onComplete: () => { cancel(); open(); },
        });
    });
    const release = pointer => { if (pointer.id === pointerId) cancel(); };
    const move = pointer => { if (pointer.id === pointerId && (Math.abs(pointer.x - x) > 45 || Math.abs(pointer.y - y) > 45)) cancel(); };
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
    scene.input.on('pointermove', move);
    scene.events.once('shutdown', () => {
        cancel();
        scene.input.off('pointerup', release);
        scene.input.off('pointerupoutside', release);
        scene.input.off('pointermove', move);
    });
}
