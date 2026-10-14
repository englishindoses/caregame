const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

function fixture({ muted = false, available = true, settings = null } = {}) {
    const timers = new Map();
    let nextId = 0, utterance;
    const synth = available ? {
        cancel() {}, getVoices: () => [{ lang: 'en-GB', localService: true, name: 'British local' }],
        speak(value) { utterance = value; },
    } : undefined;
    const window = { speechSynthesis: synth, SpeechSynthesisUtterance: available ? function(text) { this.text = text; } : undefined,
        setTimeout(fn) { timers.set(++nextId, fn); return nextId; }, clearTimeout(id) { timers.delete(id); } };
    const context = vm.createContext({ window, SpeechSynthesisUtterance: window.SpeechSynthesisUtterance,
        localStorage: { getItem: () => muted ? '1' : '0' } });
    if (settings) context.readSoundSettings = () => settings;
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../scenes/speech.js'), 'utf8'), context);
    return { context, timers, get utterance() { return utterance; }, tick() { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } } };
}

test('speech uses British English and local voice, completes only once', () => {
    const f = fixture(); let calls = 0;
    f.context.speak('Take a peek!', () => calls++);
    assert.equal(f.utterance.lang, 'en-GB');
    assert.equal(f.utterance.voice.localService, true);
    f.utterance.onend(); f.tick();
    assert.equal(calls, 1);
});
test('browser voice follows parent volume and other-sounds preference without losing continuations', () => {
    const audible = fixture({ settings: { volume: 0.4, other: true } });
    audible.context.speak('Well done!');
    assert.equal(audible.utterance.volume, 0.4);
    for (const settings of [{ volume: 0, other: true }, { volume: 1, other: false }]) {
        const silent = fixture({ settings });
        let completed = 0;
        silent.context.speak('Well done!', () => completed++);
        assert.equal(silent.utterance, undefined);
        silent.tick();
        assert.equal(completed, 1);
    }
});
test('missing, muted and failed voices still complete the flow', () => {
    for (const options of [{ available: false }, { muted: true }]) {
        const f = fixture(options); let calls = 0;
        f.context.speak('Can you find the pairs?', () => calls++);
        f.tick(); assert.equal(calls, 1);
    }
    const f = fixture(); let calls = 0;
    f.context.speak('Look!', () => calls++);
    f.utterance.onerror(); f.tick(); assert.equal(calls, 1);
});
test('watchdog completes browsers that never fire speech events', () => {
    const f = fixture(); let calls = 0;
    f.context.speak('Look!', () => calls++);
    f.tick(); assert.equal(calls, 1);
});
test('muting active browser speech completes its continuation exactly once', () => {
    const f = fixture(); let calls = 0;
    f.context.speak('Can you find the pairs?', () => calls++);
    f.context.muteSpeech(); f.tick();
    assert.equal(calls, 1);
    assert.equal(f.timers.size, 0);
    assert.equal(f.utterance.onend, null);
});
test('scene cancellation and replacing a line discard stale callbacks and timers', () => {
    const f = fixture(); let stale = 0, current = 0;
    f.context.speak('Old instruction', () => stale++);
    const handle = f.context.speak('New instruction', () => current++);
    f.utterance.onend(); f.tick();
    assert.equal(stale, 0); assert.equal(current, 1);
    const cancelled = f.context.speak('Leaving scene', () => stale++);
    cancelled.cancel(); f.tick();
    assert.equal(stale, 0); assert.equal(f.timers.size, 0);
});
