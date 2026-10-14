"""Home activity hub, parent hold settings and independent sound categories.

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

        def hold(x,y):
            box=page.locator('canvas').first.bounding_box()
            page.mouse.move(box['x']+x*box['width']/720,box['y']+y*box['height']/1280)
            page.mouse.down(); page.wait_for_timeout(2200); page.mouse.up()

        suffix='laptop' if '--laptop' in sys.argv else 'phone'
        click(360,1280*.92)
        assert page.evaluate('()=>__testGame.scene.isActive("SelectScene") && localStorage.getItem("tcm_character") === "giraffe"')
        page.screenshot(path=str(ROOT/f'tests/artifacts/home-{suffix}.png'))
        click(670,1280*.055)
        assert not page.evaluate('()=>__testGame.scene.getScene("SelectScene")._settingsOpen')
        # Moving outside the button cancels a hold.
        box=page.locator('canvas').first.bounding_box()
        page.mouse.move(box['x']+670*box['width']/720,box['y']+1280*.055*box['height']/1280)
        page.mouse.down(); page.mouse.move(box['x']+300*box['width']/720,box['y']+70*box['height']/1280)
        page.wait_for_timeout(2100);page.mouse.up()
        assert not page.evaluate('()=>__testGame.scene.getScene("SelectScene")._settingsOpen')
        hold(670,1280*.055)
        page.wait_for_function('()=>__testGame.scene.getScene("SelectScene")._settingsOpen')
        click(360,1280*.19) # Shield prevents Care starting underneath.
        assert page.evaluate('()=>__testGame.scene.isActive("SelectScene")')
        for _ in range(4): click(720*.30,1280*.42)
        click(360,1280*.595)
        assert page.evaluate('()=>localStorage.getItem("tcm_request_sound") === "0" && readSoundSettings().other')
        assert abs(page.evaluate('()=>__testGame.sound.volume')-.6)<.001
        page.screenshot(path=str(ROOT/f'tests/artifacts/settings-{suffix}.png'))
        click(360,1280*.82)
        click(720*.57,1280*.19)
        page.wait_for_function('()=>__testGame.scene.isActive("PlayScene")')
        page.wait_for_function('()=>__testGame.scene.getScene("PlayScene").currentRequest !== null',timeout=20000)
        assert page.evaluate('()=>__testGame.scene.getScene("PlayScene").characterId') == 'giraffe'
        page.evaluate('()=>__testGame.sound.context.resume()')
        result = page.evaluate('()=>{const s=__testGame.sound;const request=s.add("request_ball"),thanks=s.add("thank_you_1");request.play();thanks.play();const result={request:request.mute,thanks:thanks.mute,volume:s.volume};request.destroy();thanks.destroy();return result;}')
        assert result['request'] and not result['thanks'] and abs(result['volume']-.6)<.001, result
        page.wait_for_function('()=>!__testGame.scene.getScene("PlayScene")._inputLocked',timeout=20000)
        hold(670,50)
        labels=page.evaluate('()=>__testGame.scene.getScenes(true)[0].children.list.flatMap(o=>o.list||[o]).filter(o=>o.text?.startsWith("Back to")).map(o=>({text:o.text,x:o.x,y:o.y}))')
        assert [l['text'] for l in labels] == ['Back to Home']
        click(labels[0]['x'],labels[0]['y'])
        page.wait_for_function('()=>__testGame.scene.isActive("SelectScene")')
        hold(670,1280*.055)
        click(360,1280*.595) # Requests on.
        click(360,1280*.735) # Other sounds off.
        click(360,1280*.82)
        assert page.evaluate('()=>readSoundSettings().requests && !readSoundSettings().other')
        # Every activity launches by tapping its label, with the selected plushie.
        for i,name in enumerate(['MemoryScene','CatchScene','TidyScene','CarScene']):
            x=720*(.75 if i%2 else .25);y=1280*(.40+(i//2)*.25)+216*.70
            click(x,y)
            page.wait_for_function('(name)=>__testGame.scene.isActive(name)',arg=name,timeout=20000)
            page.wait_for_function('(name)=>__testGame.scene.getScene(name).children.list.some(o=>o.type === "Zone" && o.depth === 221)',arg=name)
            assert page.evaluate('(name)=>{const s=__testGame.scene.getScene(name);return s.mode === "full" && s.characterId === "giraffe";}',name)
            assert page.evaluate('()=>{const s=__testGame.sound;const request=s.add("request_ball"),thanks=s.add("thank_you_1");request.play();thanks.play();const result=!request.mute && thanks.mute;request.destroy();thanks.destroy();return result;}')
            if name != 'MemoryScene':
                assert page.evaluate('(name)=>otherSoundDestination(__testGame.scene.getScene(name)).gain.value === 0',name)
            print('PASS: launched',name,flush=True)
            hold(670,50)
            labels=page.evaluate('()=>__testGame.scene.getScenes(true)[0].children.list.flatMap(o=>o.list||[o]).filter(o=>o.text?.startsWith("Back to")).map(o=>({text:o.text,x:o.x,y:o.y}))')
            assert [l['text'] for l in labels] == ['Back to Care Game','Back to Home']
            point=labels[-1];click(point['x'],point['y'])
            page.wait_for_function('()=>__testGame.scene.isActive("SelectScene")')
        start('MiniGameSelectScene', {'characterId':'giraffe'})
        assert page.evaluate('()=>MINIGAMES.map(g=>g.id).join(",")') == 'memory,catch,tidy,car'
        click(180,1280*.35+252*.70)
        page.wait_for_function('()=>__testGame.scene.isActive("MemoryScene")', timeout=20000)
        assert page.evaluate('()=>{const s=__testGame.scene.getScene("MemoryScene");return s.mode === "mini" && s.level === 3;}')
        start('SelectScene', {'characterId':'giraffe'})
        toggle(True);toggle(False)
        assert page.evaluate('()=>readSoundSettings().requests && !readSoundSettings().other')
        page.reload()
        page.wait_for_function('()=>__testGame.scene.isActive("SelectScene")')
        assert page.evaluate('()=>readSoundSettings().volume === .6 && readSoundSettings().requests && !readSoundSettings().other')
        assert page.evaluate('()=>__testGame.scene.getScene("SelectScene").characterId === "giraffe"')
        assert not errors,errors
        print('PASS:',suffix,'Home launches, plushie choice, settings hold/cancel/shield, volume, independent categories after play(), synth gating, simplified doors and reload persistence',flush=True)
        browser.close()
except Exception:
    try:
        print('DEBUG:', page.evaluate('()=>({scenes:__testGame.scene.getScenes(true).map(s=>({name:s.sys.settings.key,menu:s._navigationOpen,paused:s.time.paused})),errors:0})'), errors,flush=True)
        page.screenshot(path=str(ROOT/'tests/artifacts/home-settings-failure.png'))
    except Exception:
        pass
    raise
finally:
    server.shutdown()
