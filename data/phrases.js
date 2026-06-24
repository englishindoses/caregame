const PHRASES = {
    thankYou:      ['thank_you_1', 'thank_you_2', 'thank_you_3', 'thank_you_4', 'thank_you_5'],
    thankYouFood:  ['thank_you_food_1', 'thank_you_food_2', 'thank_you_food_3', 'thank_you_food_4'],
    thankYouComfy: ['thank_you_comfy_1', 'thank_you_comfy_2', 'thank_you_comfy_3'],
    thankYouToys:  ['thank_you_toys_1'],
    wrong:         ['wrong_1', 'wrong_2', 'wrong_3', 'wrong_4'],
    sleepy:        ['sleepy_1', 'sleepy_2'],
    allDone:       'all_done',
    chosen:     ['chosen', 'chosen_2', 'chosen_3'],
    _chosenIdx: 0,
    nextChosen() {
        const key = this.chosen[this._chosenIdx % this.chosen.length];
        this._chosenIdx++;
        return key;
    },
};
