"""Targeted checks for shared mute, closed Tidy tile and three-set Memory mini.

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
        context = browser.new_context(service_workers='block', viewport={'width':390, 'height':844})
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
            page.wait_for_function('() => __testGame.scene.getScenes(true)[0].children.list.some(o=>o.type==="Zone" && o.depth===221)')
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
        scenes = [] if '--memory-only' in sys.argv else ['PlayScene','MiniGameSelectScene','CatchScene','TidyScene','CarScene','MemoryScene','SelectScene']
        for name in scenes:
            start(name)
            assert page.evaluate('() => __testGame.sound.mute')
            toggle(False)
            toggle(True)
        if scenes:
            print('PASS: mute on every play/menu scene; recorded/synth master output and saved preference toggle', flush=True)
        page.reload()
        page.wait_for_function('() => window.__testGame?.scene.isActive("SelectScene")')
        assert page.evaluate('() => __testGame.sound.mute')
        print('PASS: mute survives reload; loading scene also installs shared control', flush=True)

        start('MiniGameSelectScene')
        assert page.evaluate('() => __testGame.scene.getScene("MiniGameSelectScene").children.list.some(o=>o.texture?.key==="toy_box_closed")')
        start('TidyScene')
        page.evaluate('() => { window.revealTaps=0; __testGame.scene.getScene("TidyScene").input.once("pointerdown",()=>revealTaps++); }')
        toggle(False)
        assert page.evaluate('revealTaps') == 0
        print('PASS: closed Tidy tile; mute does not dismiss its name reveal', flush=True)

        page.evaluate('() => localStorage.setItem("tcm_memory_level","4")')
        start('MemoryScene', {'mode':'mini','characterId':'dolly'})
        assert page.evaluate('() => { const s=__testGame.scene.getScene("MemoryScene"); return s.level===3 && s.cards.length===4 && s.cards.every(c=>!c.faceUp); }')
        page.evaluate('() => { window.playedPraise=[]; const s=__testGame.scene.getScene("MemoryScene"); const play=s.voice.play; s.voice.play=(key,text,done)=>{playedPraise.push(key);play(key,text,done);}; }')
        for completed in range(3):
            ids = page.evaluate('() => [...new Set(__testGame.scene.getScene("MemoryScene").cards.map(c=>c.item.id))]')
            for item in ids:
                page.wait_for_function('() => !__testGame.scene.getScene("MemoryScene").locked', timeout=20000)
                indexes = page.evaluate('(id) => __testGame.scene.getScene("MemoryScene").cards.map((c,i)=>c.item.id===id?i:-1).filter(i=>i>=0)', item)
                for index in indexes:
                    point = page.evaluate('(i) => { const c=__testGame.scene.getScene("MemoryScene").cards[i]; return {x:c.hit.x,y:c.hit.y}; }', index)
                    click(point['x'], point['y'])
                    page.wait_for_function('(i) => { const c=__testGame.scene.getScene("MemoryScene").cards[i]; return c.faceUp && !c.flipping; }', arg=index)
            if completed < 2:
                page.wait_for_function('(n) => { const s=__testGame.scene.getScene("MemoryScene"); return s.miniSetsCleared===n && !s.locked; }', arg=completed + 1, timeout=20000)
                assert page.evaluate('() => __testGame.scene.isActive("MemoryScene")')
                print('PASS: mini set', completed + 1, 'continues at level 3', flush=True)
        page.wait_for_function('() => __testGame.scene.isActive("PlayScene")', timeout=30000)
        assert page.evaluate('localStorage.getItem("tcm_memory_level")') == '4'
        trace = page.evaluate('playedPraise')
        assert 'thank_you_5' in trace and 'well_done_1' in trace, trace
        praise = [key for key in trace if key in ['thank_you_5', 'well_done_1']]
        assert praise[0] == 'thank_you_5' and len(praise) == 9, praise
        assert not errors, errors
        print('PASS: three sets then care; saved level unchanged; both recorded praise clips used; no runtime errors', flush=True)
        browser.close()
finally:
    server.shutdown()
