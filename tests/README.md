# Merge checks

The production game has no build step or npm dependencies. These checks are development tools only.

Run the dependency-free rules and speech checks:

```powershell
node --test tests/memory-rules.test.js tests/speech.test.js
```

For browser checks, install Python Playwright/Chromium in your development environment and serve this repository on `http://127.0.0.1:8000/`. The checks use the exact Phaser 3.60.0 bundle already used by the game, saved under the ignored `tests/.cache/phaser-3.60.0.min.js`. To prepare that test-only file:

```powershell
New-Item -ItemType Directory -Force tests/.cache
Invoke-WebRequest 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js' -OutFile tests/.cache/phaser-3.60.0.min.js
```

With the local server running:

```powershell
python tests/merge-smoke.py
python tests/cache-check.py
python tests/mute-memory-smoke.py
```

The integration checks exercise actual Phaser scenes and pointer targets at phone/laptop viewport sizes: guided matching, preview, mismatches/peek, full-mode persistence, mini mode fixed at level 3 regardless of saved progress, without changing progression, navigation, character switching and the care game's existing two-tray break. Speech tests cover unavailable, muted, failed and stalled browser voices, plus cancellation on scene exit.

The cache check validates local precache paths and new resources, then opens Home, All Games and Memory offline. It seeds a downloaded Phaser copy to model the existing CDN dependency having been cached successfully; it does not claim to verify CDN availability or fix unrelated offline assets.

Screenshots/logs go in ignored `tests/artifacts/`. Browser instrumentation exists only in the test context; no production dev hooks are exposed. Real-phone drag/touch feel and the quality/availability of the device's British voice need a device playtest.

`mute-memory-smoke.py` starts its own temporary local server and checks saved mute across screens/reloads, the closed Tidy tile, three level-3 Memory mini sets, recorded praise variety and unchanged full-game progress.

Full-game checks (starts its own server):

```powershell
python tests/full-games-smoke.py
python tests/full-games-smoke.py --laptop
```

Checks all three menu launches, continued Catch, two repeated Tidy batches, unlimited Drive, shared door returns and resetting to mini mode.
