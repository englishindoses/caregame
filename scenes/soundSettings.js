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
        const bg = scene.add.rectangle(W / 2, H / 2, W * 0.92, H * 0.72, 0xFFF8EC);
        panel.add([shield, bg]);
        const text = (x, y, copy, size = W * 0.048) => {
            const label = scene.add.text(x, y, copy, { fontFamily: 'Quicksand, Arial', fontSize: `${size}px`, color: '#5a4938', align: 'center' }).setOrigin(0.5);
            panel.add(label);
            return label;
        };
        const button = (x, y, width, copy, action) => {
            const rect = scene.add.rectangle(x, y, width, H * 0.067, 0xDAE5C6);
            panel.add(rect);
            const label = text(x, y, copy);
            const zone = scene.add.zone(x, y, width, H * 0.067).setInteractive({ useHandCursor: true });
            zone.on('pointerdown', (_p, _x, _y, event) => { event.stopPropagation(); action(label); });
            panel.add(zone);
            return label;
        };
        text(W / 2, H * 0.22, 'Parent settings', W * 0.065);
        const volume = text(W / 2, H * 0.34, '');
        const updateVolume = amount => {
            const value = Math.round(Math.max(0, Math.min(1, readSoundSettings().volume + amount)) * 100) / 100;
            localStorage.setItem('tcm_volume', String(value));
            applySoundSettings(scene);
            volume.setText(`Volume: ${Math.round(value * 100)}%`);
        };
        volume.setText(`Volume: ${Math.round(readSoundSettings().volume * 100)}%`);
        button(W * 0.30, H * 0.42, W * 0.28, 'Quieter', () => updateVolume(-0.1));
        button(W * 0.70, H * 0.42, W * 0.28, 'Louder', () => updateVolume(0.1));
        const toggle = (key, field, title, y) => {
            text(W / 2, y, title);
            button(W / 2, y + H * 0.065, W * 0.65, readSoundSettings()[field] ? 'On' : 'Off', label => {
                const enabled = !readSoundSettings()[field];
                localStorage.setItem(key, enabled ? '1' : '0');
                applySoundSettings(scene);
                label.setText(enabled ? 'On' : 'Off');
            });
        };
        toggle('tcm_request_sound', 'requests', 'Dolly request sound', H * 0.53);
        toggle('tcm_other_sound', 'other', 'Other sounds', H * 0.67);
        button(W / 2, H * 0.82, W * 0.65, 'Done', () => {
            panel.destroy(true);
            panel = null;
            scene._settingsOpen = false;
        });
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
