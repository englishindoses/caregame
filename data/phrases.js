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

    // ── Tidy Time mini-game ──────────────────────────────────────────────────
    tidyChosen:    ['tidy_chosen_1', 'tidy_chosen_2', 'tidy_chosen_3'],   // tapped the toy-box tile
    tidyOpening:   ['tidy_opening_1', 'tidy_opening_2'],   // scene entry
    tidyName: {                                            // spoken as each toy drops in (keyed by toy id)
        ball:   'item_name_ball',
        book:   'item_name_book',
        blocks: 'item_name_blocks',
        car:    'item_name_car',
        teddy:  'item_name_teddy',
    },
    // Occasional encouragement after a drop. 'in_it_goes_2' ("and that one!") also
    // wobbles a random remaining toy. 'well_done_1' is a reusable praise line.
    inItGoes:      ['in_it_goes_1', 'in_it_goes_2', 'in_it_goes_3', 'well_done_1'],
    nextOne:       ['next_one_1', 'next_one_2'],                      // (defined for later; not wired yet)
    tidyOops:      ['tidy_oops_1', 'tidy_oops_2'],        // ~40% on a floor drop
    allTidy:       ['all_tidy_1', 'all_tidy_2'],          // last toy in, celebration

    chosen:     ['chosen', 'chosen_2', 'chosen_3'],
    _chosenIdx: 0,
    nextChosen() {
        const key = this.chosen[this._chosenIdx % this.chosen.length];
        this._chosenIdx++;
        return key;
    },
};
