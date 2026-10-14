"""Full game menu, continuous play, repeated Tidy batches and mini-mode regression checks.

Uses an ephemeral local server and the exact test-only Phaser 3.60.0 bundle.
"""
from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from threading import Thread
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
Thread(target=server.serve_forever, daemon=True).start()
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--log-file=' + str(ROOT / 'tests/artifacts/browser-debug.log')])
        context = browser.new_context(service_workers='block', viewport={'width':1366, 'height':900} if '--laptop' in sys.argv else {'width':390, 'height':844})
        context.route('https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js', lambda route: route.fulfill(path=str(ROOT / 'tests/.cache/phaser-3.60.0.min.js'), content_type='application/javascript'))
        entry = (ROOT / 'main.js').read_text(encoding='utf-8').replace('new Phaser.Game(config);', 'window.__testGame = new Phaser.Game(config);')
        context.route('**/main.js', lambda route: route.fulfill(body=entry, content_type='application/javascript'))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto('http://127.0.0.1:' + str(server.server_port) + '/')
        page.wait_for_function('() => window.__testGame?.scene.isActive("SelectScene")')
        page.wait_for_timeout(250)

        def click(x, y):
            box = page.locator('canvas').first.bounding_box()
            page.mouse.click(box['x'] + x * box['width'] / 720, box['y'] + y * box['height'] / 1280, delay=100)

        def start(name, data=None):
            page.evaluate('([name,data]) => __testGame.scene.getScenes(true)[0].scene.start(name,data)', [name, data or {'characterId':'dolly'}])
            page.wait_for_function('(name) => __testGame.scene.isActive(name)', arg=name)
            page.wait_for_function('(name) => __testGame.scene.getScene(name).input._list.some(o=>o.type==="Zone" && o.depth===221)',arg=name)
            page.wait_for_timeout(150)

        def toggle(expected):
            home = page.evaluate('()=>__testGame.scene.isActive("SelectScene")')
            click(50 if home else 670, 1280 * (.055 if home else .13))
            page.wait_for_function('(value) => localStorage.getItem("tcm_mute") === (value ? "1" : "0")', arg=expected)
            page.evaluate('() => __testGame.sound.context.resume()')
            page.wait_for_function('(value) => __testGame.sound.mute === value', arg=expected)
            assert page.evaluate('localStorage.getItem("tcm_mute")') == ('1' if expected else '0')
            assert page.evaluate('() => __testGame.sound.masterMuteNode.gain.value') == (0 if expected else 1)

        toggle(True)
        for game, scene in [('catch','CatchScene'),('tidy','TidyScene'),('car','CarScene')]:
            start('SelectScene')
            tiles = page.evaluate('() => __testGame.scene.getScene("SelectScene").children.list.filter(o=>["memory_tile","item_ball","toy_box_closed","item_car"].includes(o.texture?.key)).map(o=>({key:o.texture.key,x:o.x,y:o.y,w:o.displayWidth,h:o.displayHeight}))')
            assert len(tiles) == 4, tiles
            assert all(t['x']-t['w']/2 >= 0 and t['x']+t['w']/2 <= 720 and t['y']+t['h']/2 < 1000 for t in tiles)
            page.screenshot(path=str(ROOT / ('tests/artifacts/full-menu-laptop.png' if '--laptop' in sys.argv else 'tests/artifacts/full-menu-phone.png')))
            point = tiles[['catch','tidy','car'].index(game)+1]
            click(point['x'],point['y'])
            page.wait_for_function('(name)=>__testGame.scene.isActive(name)', arg=scene, timeout=20000)
            page.wait_for_function('(name)=>__testGame.scene.getScene(name).mode === "full"',arg=scene)
            if game == 'catch':
                page.wait_for_function('()=>__testGame.scene.getScene("CatchScene").phase === "idle"',timeout=20000)
                page.evaluate('()=>{const s=__testGame.scene.getScene("CatchScene");s.catchCount=6;s.characterCatch();}')
                assert page.evaluate('()=>__testGame.scene.getScene("CatchScene").phase') == 'held'
                page.wait_for_function('()=>__testGame.scene.getScene("CatchScene").phase === "idle"',timeout=20000)
            elif game == 'tidy':
                for batch in range(2):
                    for i in range(5):
                        page.wait_for_function('()=>!__testGame.scene.getScene("TidyScene")._dragLocked',timeout=20000)
                        page.evaluate('(i)=>{const s=__testGame.scene.getScene("TidyScene");s.dropInBox(s.toys[i]);}',i)
                        page.wait_for_function('()=>__testGame.scene.getScene("TidyScene")._revealActive',timeout=20000)
                        click(360,400)
                    page.wait_for_function('()=>{const s=__testGame.scene.getScene("TidyScene");return s.mode === "full" && s.remaining === 5 && !s._ending;}',timeout=20000)
                    assert page.evaluate('()=>__testGame.scene.getScene("TidyScene").toys.length') == 5
            else:
                assert page.evaluate('()=>__testGame.scene.getScene("CarScene")._autoEnd') is None
                page.evaluate('()=>__testGame.scene.getScene("CarScene").autoEnd()')
                assert page.evaluate('()=>__testGame.scene.isActive("CarScene")')
            print('PASS: full', game, 'launch and continuous play', flush=True)
            # Full games return directly Home on a child tap.
            click(670,60)
            page.wait_for_function('()=>__testGame.scene.isActive("SelectScene")')
            start(scene)  # Re-enter without full mode: care-break behaviour resets.
            assert page.evaluate('(name)=>__testGame.scene.getScene(name).mode',scene) == 'mini'
            if game == 'car':
                assert page.evaluate('()=>!!__testGame.scene.getScene("CarScene")._autoEnd')
            elif game == 'catch':
                page.evaluate('()=>{const s=__testGame.scene.getScene("CatchScene");s.catchCount=5;s.characterCatch();}')
                assert page.evaluate('()=>__testGame.scene.getScene("CatchScene").phase') == 'ended'
            else:
                page.evaluate('()=>__testGame.scene.getScene("TidyScene").playEndLine()')
                page.wait_for_function('()=>__testGame.scene.isActive("PlayScene")',timeout=20000)
        assert not errors, errors
        page.screenshot(path=str(ROOT/'tests/artifacts/full-games.png'))
        print('PASS: door navigation, mini-mode reset and no runtime errors',flush=True)
        browser.close()
finally:
    server.shutdown()
