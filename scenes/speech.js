// Whole-line British browser voice for lines that have no recording yet.
let currentSpeech = null;

function speak(text, onEnd, options = {}) {
    text = String(text || '');
    if (currentSpeech) currentSpeech.cancel();
    const synth = window.speechSynthesis;
    let finished = false, timer, utterance;
    const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(timer);
        if (currentSpeech === handle) currentSpeech = null;
        if (onEnd) onEnd();
    };
    const handle = {
        // Muting ends a spoken line without losing a game-state continuation.
        mute() {
            if (finished) return;
            if (utterance) { utterance.onend = null; utterance.onerror = null; }
            if (synth) synth.cancel();
            finish();
        },
        // Scene exits/replacement instructions deliberately discard callbacks.
        cancel() {
            if (finished) return;
            finished = true;
            window.clearTimeout(timer);
            if (utterance) { utterance.onend = null; utterance.onerror = null; }
            if (currentSpeech === handle) {
                currentSpeech = null;
                if (synth) synth.cancel();
            }
        },
    };
    currentSpeech = handle;
    const muted = options.muted === undefined ? localStorage.getItem('tcm_mute') === '1' : options.muted;
    if (muted || !synth || !window.SpeechSynthesisUtterance || !text) {
        timer = window.setTimeout(finish, muted ? Math.min(2600, 300 + text.length * 45) : 700);
        return handle;
    }
    try {
        utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-GB';
        utterance.rate = 0.9;
        utterance.pitch = 1.05;
        const voices = synth.getVoices();
        utterance.voice = voices.find(v => v.lang === 'en-GB' && v.localService)
            || voices.find(v => v.lang === 'en-GB') || null;
        utterance.onend = finish;
        utterance.onerror = finish;
        timer = window.setTimeout(() => { synth.cancel(); finish(); }, Math.min(12000, 2500 + text.length * 110));
        synth.speak(utterance);
    } catch {
        timer = window.setTimeout(finish, 700);
    }
    return handle;
}

function muteSpeech() {
    if (currentSpeech) currentSpeech.mute();
    else if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// Scene-owned recorded voice or whole-line speech fallback, never both together.
function createSceneVoice(scene) {
    let sound = null, speech = null, fallback = null, unlock = null, generation = 0;
    const stop = () => {
        generation++;
        if (unlock) { scene.sound.off('unlocked', unlock); unlock = null; }
        if (fallback) { fallback.remove(); fallback = null; }
        if (speech) { speech.cancel(); speech = null; }
        if (sound) { sound.removeAllListeners(); sound.stop(); sound.destroy(); sound = null; }
    };
    const play = (key, text, onEnd) => {
        stop();
        const token = generation;
        let done = false;
        const finish = () => {
            if (done || token !== generation || !scene.sys.isActive()) return;
            done = true;
            stop();
            if (onEnd) onEnd();
        };
        if (key && scene.cache.audio.exists(key)) {
            sound = scene.sound.add(key);
            sound.once('complete', finish);
            fallback = scene.time.delayedCall(Math.max(6000, sound.duration * 1000 + 2500), finish);
            const start = () => {
                unlock = null;
                if (token === generation && sound) {
                    try { if (!sound.play()) finish(); } catch { finish(); }
                }
            };
            if (scene.sound.locked) { unlock = start; scene.sound.once('unlocked', unlock); }
            else start();
        } else {
            speech = speak(text, finish, { muted: scene.sound.mute });
        }
    };
    scene.events.once('shutdown', stop);
    return { play, stop };
}
