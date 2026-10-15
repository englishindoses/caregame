"""Check the merge's local precache entries and offline Memory routing.

Uses the same test-only Phaser copy as merge-smoke.py. Seeding that already
downloaded CDN bundle models a successful existing Phaser cache; this check
does not change or test the project's CDN availability policy.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
sw = (ROOT / 'sw.js').read_text(encoding='utf-8')
asset_text = sw.split('const ASSETS = [', 1)[1].split('];', 1)[0]
assets = re.findall(r"^\s*'\./([^']*)'", asset_text, re.MULTILINE)
assert all(not asset or (ROOT / asset).is_file() for asset in assets), 'Precache references a missing file'
assert len(assets) == len(set(assets)), 'Duplicate precache entries'
scripts = re.findall(r'<script src="([^":]+\.js)"', (ROOT / 'index.html').read_text(encoding='utf-8'))
assert all(script in assets for script in scripts), 'A runtime script is missing from precache'
expected = ['assets/images/bg_home.webp', 'assets/images/exit_door.png', 'assets/images/bg_memory.webp', 'assets/images/all_games_icon.webp', 'assets/images/toy_box_closed.png', 'data/memory.js', 'data/allgames.js',
            'scenes/MemoryScene.js', 'scenes/AllGamesScene.js', 'scenes/doorButton.js',
            'scenes/soundSettings.js', 'scenes/speech.js', 'scenes/muteButton.js', 'scenes/characterSwitcher.js', 'scenes/memoryArt.js',
            'assets/audio/well_done_1.mp3', 'assets/audio/item_name_ball.mp3']
assert all(asset in assets for asset in expected)
print('PASS: all local precache paths exist; new runtime scripts and Memory media included', flush=True)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--log-file=' + str(ROOT / 'tests/artifacts/browser-debug.log')])
    context = browser.new_context(viewport={'width':390,'height':844})
    cdn = 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js'
    bundle = (ROOT / 'tests/.cache/phaser-3.60.0.min.js').read_text(encoding='utf-8')
    context.route(cdn, lambda route: route.fulfill(body=bundle, content_type='application/javascript'))
    # Observe Game construction without replacing any locally served/cached file.
    context.add_init_script('''let testPhaser;
        Object.defineProperty(window, 'Phaser', { configurable:true,
            get() { return testPhaser; },
            set(value) { testPhaser=value; const Game=value.Game;
                value.Game=class extends Game { constructor(config) { super(config); window.__testGame=this; } };
            }
        });''')
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:' + str(server.server_port) + '/')
    page.wait_for_function('() => window.__testGame?.scene.isActive("SelectScene")')
    page.evaluate('() => navigator.serviceWorker.ready')
    page.evaluate('async ([cdn, bundle]) => { const cache = await caches.open("tcm-v20"); await cache.put(cdn, new Response(bundle, {headers:{"Content-Type":"application/javascript"}})); }', [cdn, bundle])
    for asset in expected:
        assert page.evaluate('async asset => !!(await caches.match(new URL(asset,location.href)))', asset), asset
    # All local offline requests must be served by the worker, not HTTP routes.
    page.reload()
    page.wait_for_function('() => !!navigator.serviceWorker.controller')
    context.set_offline(True)
    # Context routing supplies no local files now; local requests use the worker.
    context.unroute(cdn)
    page.reload()
    page.wait_for_function('() => window.__testGame?.scene.isActive("SelectScene")')
    assert page.evaluate('() => __testGame.textures.exists("bg_home")')
    page.evaluate('() => __testGame.scene.getScene("SelectScene").scene.start("MemoryScene",{mode:"full"})')
    page.wait_for_function('() => __testGame.scene.getScene("MemoryScene").cards?.length === 4')
    for name in ['CatchScene', 'TidyScene', 'CarScene']:
        page.evaluate('(name) => __testGame.scene.getScenes(true)[0].scene.start(name,{mode:"full",characterId:"dolly"})', name)
        page.wait_for_function('(name) => __testGame.scene.isActive(name) && __testGame.scene.getScene(name).mode === "full"', arg=name)
        page.wait_for_function('() => __testGame.scene.getScenes(true)[0].children.list.some(o=>o.type === "Zone" && o.depth === 221)')
    assert page.evaluate('() => __testGame.textures.exists("toy_box_open")')
    assert page.evaluate('() => __testGame.cache.audio.exists("boing_1")')
    assert not errors, errors
    print('PASS: new assets cached before first visit; offline Home, Memory, Catch, Tidy and Drive', flush=True)
    browser.close()
