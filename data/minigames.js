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
    {
        id:          'tidy',
        name:        'Tidy',
        image:       'toy_box_closed',
        imageSrc:    'assets/images/toy_box_closed.png',  // not a main-game asset — select screen loads it
        tileScale:   1.4,           // draw the box tile bigger than the default
        chosenGroup: 'tidyChosen',
        scene:       'TidyScene',
    },
    {
        id:          'car',
        name:        'Drive',
        image:       'item_car',    // reuse the existing toy-car art
        tileScale:   1.1,
        chosenGroup: 'driveChosen', // silent until drive_chosen_* are recorded
        scene:       'CarScene',
    },
    // Future: 'story', 'writing' added here.
];
