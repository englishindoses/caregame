// Mini-games offered on the "What shall we play?" screen.
// Each entry declares its own tile image, the PHRASES group used for its
// "chosen" audio, and the scene to launch — so adding a new mini-game is just
// a data edit plus the scene file. Catch, Tidy, Drive and Memory are wired.
const MINIGAMES = [
    {
        id: 'memory', name: 'Memory', image: 'memory_tile',
        chosenGroup: 'memoryChosen', chosenText: "Let's play memory!",
        scene: 'MemoryScene', mode: 'mini',
    },

    {
        id:          'catch',
        name:        'Catch',
        image:       'item_ball',
        chosenGroup: 'playCatch',   // PHRASES key for the "let's play catch!" lines
        scene:       'CatchScene',
    },
    {
        id:          'tidy',
        name:        'Tidy Time',
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
    // Future games are added here one at a time.
];
