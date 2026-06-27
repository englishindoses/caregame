const PHRASES = {
    thankYou:      ['thank_you_1', 'thank_you_2', 'thank_you_3', 'thank_you_5'],
    thankYouFood:  ['thank_you_food_1', 'thank_you_food_2', 'thank_you_food_3', 'thank_you_food_4'],
    thankYouComfy: ['thank_you_comfy_1', 'thank_you_comfy_2', 'thank_you_comfy_3'],
    thankYouToys:  ['thank_you_toys_1'],
    wrong:         ['wrong_1', 'wrong_2', 'wrong_3', 'wrong_4'],
    sleepy:        ['sleepy_1', 'sleepy_2', 'sleepy_3'],
    allDone:       'all_done',

    // ── Catch mini-game ──────────────────────────────────────────────────────
    playInvite:    ['play_invite_1', 'play_invite_2', 'play_invite_3'],  // "What shall we play?"
    playCatch:     ['play_catch_1', 'play_catch_2'],                      // tapped the ball tile
    catchExcite:   ['catch_excite_1', 'catch_excite_2', 'catch_excite_3'],// character caught it
    playerCatch:   ['player_catch_1', 'player_catch_2', 'player_catch_3'],// child caught it
    playTired:     ['play_tired_1', 'play_tired_2', 'play_tired_3'],      // 5 catches done, wind down

    chosen:     ['chosen', 'chosen_2', 'chosen_3'],
    _chosenIdx: 0,
    nextChosen() {
        const key = this.chosen[this._chosenIdx % this.chosen.length];
        this._chosenIdx++;
        return key;
    },
};
