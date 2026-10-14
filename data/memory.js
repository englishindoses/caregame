// Rules carried over from preschooler-game's MemoryScene, with portrait layout.
const MEMORY_MINI_SETS = 3;
const MEMORY_LEVELS = {
    1: { guided: true, preview: false, boards: [4, 4, 6, 6] },
    2: { guided: false, preview: true, cards: 4 },
    3: { guided: false, preview: false, cards: 4 },
    4: { guided: false, preview: true, cards: 6 },
};

function readMemoryLevel() {
    const saved = Number(localStorage.getItem('tcm_memory_level'));
    return Number.isInteger(saved) && MEMORY_LEVELS[saved] ? saved : 1;
}

// Only full mode calls this. Mini mode never writes or adjusts progression.
function advanceMemoryProgress(level, boardIndex, setsCleared, mismatches) {
    if (MEMORY_LEVELS[level].guided) {
        boardIndex++;
        if (boardIndex >= MEMORY_LEVELS[level].boards.length) {
            return { level: 2, boardIndex: 0, setsCleared: 0 };
        }
        return { level, boardIndex, setsCleared };
    }
    if (mismatches >= 4 && level > 2) {
        return { level: level - 1, boardIndex: 0, setsCleared: 0 };
    }
    setsCleared++;
    if (setsCleared >= 5 && level < 4) {
        return { level: level + 1, boardIndex: 0, setsCleared: 0 };
    }
    return { level, boardIndex, setsCleared };
}
