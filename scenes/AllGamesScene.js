// Compatibility route for existing bookmarks/callers: Home now lists every activity.
class AllGamesScene extends Phaser.Scene {
    constructor() { super('AllGamesScene'); }
    create() { this.scene.start('SelectScene', { characterId: localStorage.getItem('tcm_character') || 'dolly' }); }
}
