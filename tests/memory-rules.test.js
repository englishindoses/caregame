// Run with node --test tests/memory-rules.test.js. No installed dependencies.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = vm.createContext({ localStorage: { getItem: () => null } });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../data/memory.js'), 'utf8'), context);
const advance = (...args) => JSON.parse(JSON.stringify(context.advanceMemoryProgress(...args)));

test('guided boards progress 4, 4, 6, 6, then enter memory level 2', () => {
    assert.deepEqual(Array.from(vm.runInContext('MEMORY_LEVELS[1].boards', context)), [4, 4, 6, 6]);
    let state = { level: 1, boardIndex: 0, setsCleared: 0 };
    for (let i = 0; i < 3; i++) state = advance(state.level, state.boardIndex, state.setsCleared, 0);
    assert.deepEqual(state, { level: 1, boardIndex: 3, setsCleared: 0 });
    assert.deepEqual(advance(1, 3, 0, 0), { level: 2, boardIndex: 0, setsCleared: 0 });
});
test('five completed sets advance each memory level, capped at four', () => {
    assert.equal(advance(2, 0, 3, 0).level, 2);
    assert.deepEqual(advance(2, 0, 4, 0), { level: 3, boardIndex: 0, setsCleared: 0 });
    assert.equal(advance(3, 0, 4, 0).level, 4);
    assert.equal(advance(4, 0, 4, 0).level, 4);
});
test('four mismatches step down before promotion, never into guided level', () => {
    assert.deepEqual(advance(4, 0, 4, 4), { level: 3, boardIndex: 0, setsCleared: 0 });
    assert.equal(advance(3, 0, 0, 4).level, 2);
    assert.equal(advance(2, 0, 0, 9).level, 2);
});
test('invalid saved levels fall back to the guided introduction', () => {
    for (const saved of [null, '', '0', '5', '2.5', 'abc', 'NaN']) {
        context.localStorage.getItem = () => saved;
        assert.equal(context.readMemoryLevel(), 1);
    }
    for (const saved of ['1', '2', '3', '4']) {
        context.localStorage.getItem = () => saved;
        assert.equal(context.readMemoryLevel(), Number(saved));
    }
});
