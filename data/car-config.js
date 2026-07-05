// Tunables for the Little Driver (car) mini-game. Kept in one place so the feel
// can be adjusted without touching CarScene logic.
const CAR_CONFIG = {
    WHEEL_MAX_DEG:        120,   // how far the wheel can turn each way
    WHEEL_RETURN_MS:      400,   // spring-back-to-centre time on release
    WIPER_CYCLES:         3,     // full there-and-back sweeps per tap
    WIPER_SWEEP_MS:       520,   // one half-sweep (out OR back)
    INDICATOR_TIMEOUT_MS: 6000,  // auto-off after this long
    INDICATOR_TICK_MS:    560,   // tick-tock interval
    PARALLAX_MAX_PX:      42,    // max scenery shift at full lock
    DASH_WIDTH_FRAC:      1.0,   // dashboard image width as a fraction of screen width (scaled proportionally)
    AUTO_END_MS:          60000, // auto-return to the main game after this long (WIP — tuning with testing)
};
