// Mini-games offered on the "What shall we play?" screen.
// Each entry declares its own tile image, the PHRASES group used for its
// "chosen" audio, and the scene to launch — so adding a new mini-game is just
// a data edit plus the scene file. Only 'catch' is wired up for now.
const MINIGAMES = [
    {
        id:          'catch',
        name:        'Catch',
        image:       'item_ball',
        chosenGroup: 'playCatch',   // PHRASES key for the "let's play catch!" lines
        scene:       'CatchScene',
    },
    // Future: 'tidy', 'story', 'writing' added here.
];
