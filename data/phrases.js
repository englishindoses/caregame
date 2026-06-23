const PHRASES = {
    thankYou:   ['thank_you_1', 'thank_you_2', 'thank_you_3', 'thank_you_4'],
    allDone:    'all_done',
    chosen:     ['chosen', 'chosen_2', 'chosen_3'],
    _chosenIdx: 0,
    nextChosen() {
        const key = this.chosen[this._chosenIdx % this.chosen.length];
        this._chosenIdx++;
        return key;
    },
};
