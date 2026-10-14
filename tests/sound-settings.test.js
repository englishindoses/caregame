const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function fixture(values = {}) {
    const saved = new Map(Object.entries(values));
    let mutedSpeech = 0;
    const context = vm.createContext({
        localStorage: { getItem: key => saved.has(key) ? saved.get(key) : null },
        muteSpeech: () => mutedSpeech++,
    });
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../scenes/soundSettings.js'), 'utf8'), context);
    const sound = {
        sounds: [],
        masterVolumeNode: { gain: { cancelScheduledValues() {}, value: 1 } },
        add(key, config) {
            const entry = { key, mute: config.mute, setMute(value) { this.mute = value; }, play(marker, options) { this.mute = options.mute; return true; } };
            this.sounds.push(entry);
            return entry;
        },
    };
    return { context, saved, scene: { sound }, get mutedSpeech() { return mutedSpeech; } };
}

test('defaults enable both categories; stored volume is bounded and invalid values recover', () => {
    for (const [value, expected] of [[undefined, 1], ['0.4', 0.4], ['5', 1], ['-1', 0], ['oops', 1]]) {
        const f = fixture(value === undefined ? {} : { tcm_volume: value });
        const settings = f.context.readSoundSettings();
        assert.equal(settings.volume, expected);
        assert.equal(settings.requests, true);
        assert.equal(settings.other, true);
    }
});

test('requests and thanks remain independently controllable, including already-created sounds', () => {
    const f = fixture({ tcm_request_sound: '0', tcm_other_sound: '1', tcm_volume: '0.6' });
    f.context.applySoundSettings(f.scene);
    const request = f.scene.sound.add('request_ball');
    const thanks = f.scene.sound.add('thank_you_toys_1');
    assert.equal(request.mute, true);
    assert.equal(thanks.mute, false);
    assert.equal(f.scene.sound.volume, 0.6);
    f.saved.set('tcm_request_sound', '1');
    f.saved.set('tcm_other_sound', '0');
    const add = f.scene.sound.add;
    f.context.applySoundSettings(f.scene);
    assert.equal(f.scene.sound.add, add, 'install the shared wrapper only once');
    assert.equal(request.mute, false);
    assert.equal(thanks.mute, true);
    assert.equal(f.scene.sound.add('boing_1').mute, true);
    assert.equal(f.mutedSpeech, 1);
});

test('scene changes skip destroyed sounds awaiting Phaser removal', () => {
    const f = fixture();
    f.context.applySoundSettings(f.scene);
    const old = f.scene.sound.add('thank_you_1');
    old.pendingRemove = true;
    old.setMute = () => { throw new Error('already destroyed'); };
    assert.doesNotThrow(() => f.context.applySoundSettings(f.scene));
});
