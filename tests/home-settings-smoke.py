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

        def hold(x,y):
            box=page.locator('canvas').first.bounding_box()
            page.mouse.move(box['x']+x*box['width']/720,box['y']+y*box['height']/1280)
            page.mouse.down(); page.wait_for_timeout(2200); page.mouse.up()

        suffix='laptop' if '--laptop' in sys.argv else 'phone'
        friend=page.evaluate('()=>{const h=__testGame.scene.getScene("SelectScene").plushieChoices.find(c=>c.id === "giraffe").hit;return {x:h.x,y:h.y};}')
        click(friend['x'],friend['y'])
        assert page.evaluate('()=>__testGame.scene.isActive("SelectScene") && localStorage.getItem("tcm_character") === "giraffe"')
        assert page.evaluate('()=>{const s=__testGame.scene.getScene("SelectScene"),selected=s.plushieChoices.find(c=>c.id === s.characterId).picture;return s.children.list.some(o=>o.text === "Care Game") && s.plushieChoices.filter(c=>c.id !== s.characterId).every(c=>c.picture.displayHeight < selected.displayHeight && Math.abs(c.picture.y+c.picture.displayHeight/2 - selected.y-selected.displayHeight/2) < 1);}')
        assert page.evaluate('()=>{const s=__testGame.scene.getScene("SelectScene");return s.plushieChoices.every(c=>c.picture.texture.key === c.id+"_"+(c.id === s.characterId ? "neutral" : "sleeping")) && s.carePicture.texture.key === "giraffe_neutral";}')
        assert page.evaluate('()=>!__testGame.scene.getScene("SelectScene").children.list.some(o=>o.text === "Choose a friend")')
        layout=page.evaluate('()=>__testGame.scene.getScene("SelectScene").gameTiles.map(({tile,label,hit})=>({image:tile.getBounds(),label:label.getBounds(),cell:hit.getBounds()}))')
        for row in layout:
            for part in ['image','label']:
                box=row[part];cell=row['cell']
                assert box['x']>=cell['x'] and box['x']+box['width']<=cell['x']+cell['width']
                assert box['y']>=cell['y'] and box['y']+box['height']<=cell['y']+cell['height']
            assert row['image']['y']+row['image']['height']<row['label']['y']
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
        click(360,1280*.267) # Shield prevents Care starting underneath.
        assert page.evaluate('()=>__testGame.scene.isActive("SelectScene")')
        box=page.locator('canvas').first.bounding_box()
        page.mouse.move(box['x']+612*box['width']/720,box['y']+1280*.432*box['height']/1280)
        page.mouse.down()
        page.mouse.move(box['x']+720*.57*box['width']/720,box['y']+1280*.432*box['height']/1280,steps=8)
        page.wait_for_timeout(150);page.mouse.up()
        click(720*.825,1280*.52)
        click(720*.825,1280*.52) # Selecting Off twice must keep it off.
        assert page.evaluate('()=>localStorage.getItem("tcm_request_sound") === "0" && readSoundSettings().other')
        assert page.evaluate('()=>{const panel=__testGame.scene.getScene("SelectScene").children.list.find(o=>o.depth === 300),row=panel.list.filter(o=>o.type === "Text" && Math.abs(o.y-1280*.52)<1);return row.find(o=>o.text === "Off").style.color === "#FFF8EC" && row.find(o=>o.text === "On").style.color === "#64513D" && row.some(o=>o.text === "Dolly request sound");}')
        assert abs(page.evaluate('()=>__testGame.sound.volume')-.6)<.001
        for level,x in [(1,.23),(2,.41),(3,.59),(4,.77)]:
            click(720*x,1280*.752)
            assert page.evaluate('localStorage.getItem("tcm_memory_level")') == str(level)
        assert page.evaluate('()=>{const panel=__testGame.scene.getScene("SelectScene").children.list.find(o=>o.depth === 300);return panel.list.some(o=>o.text === "6 cards with a preview");}')
        page.screenshot(path=str(ROOT/f'tests/artifacts/settings-{suffix}.png'))
        click(360,1280*.882)
        if '--home-only' in sys.argv:
            assert not errors, errors
            print('PASS:',suffix,'Home layout, larger toys/friends, sleeping/neutral poses and parent settings',flush=True)
            browser.close()
            sys.exit(0)
        click(360,1280*.267)
        page.wait_for_function('()=>__testGame.scene.isActive("PlayScene")')
        page.wait_for_function('()=>__testGame.scene.getScene("PlayScene").currentRequest !== null',timeout=20000)
        assert page.evaluate('()=>__testGame.scene.getScene("PlayScene").characterId') == 'giraffe'
        page.evaluate('()=>__testGame.sound.context.resume()')
        result = page.evaluate('()=>{const s=__testGame.sound;const request=s.add("request_ball"),thanks=s.add("thank_you_1");request.play();thanks.play();const result={request:request.mute,thanks:thanks.mute,volume:s.volume};request.destroy();thanks.destroy();return result;}')
        assert result['request'] and not result['thanks'] and abs(result['volume']-.6)<.001, result
        page.wait_for_function('()=>!__testGame.scene.getScene("PlayScene")._inputLocked',timeout=20000)
        assert page.evaluate('()=>{const door=__testGame.scene.getScene("PlayScene").children.list.find(o=>o.texture?.key === "exit_door"),bounds=door.getBounds();return bounds.y>0 && bounds.x+bounds.width<720 && door.displayHeight>=80 && door.displayHeight<=97;}')
        page.screenshot(path=str(ROOT/f'tests/artifacts/door-{suffix}.png'))
        click(670,60)
        page.wait_for_function('()=>__testGame.scene.isActive("SelectScene")')
        assert page.evaluate('()=>!__testGame.scene.getScene("SelectScene").children.list.some(o=>o.depth === 200)')
        assert page.evaluate('()=>__testGame.scene.getScene("SelectScene").characterId === "giraffe"')
        hold(670,1280*.055)
        click(720*.665,1280*.52) # Requests on.
        click(720*.825,1280*.61) # Other sounds off.
        click(360,1280*.882)
        assert page.evaluate('()=>readSoundSettings().requests && !readSoundSettings().other')
        # Every activity launches by tapping its label, with the selected plushie.
        for i,name in enumerate(['MemoryScene','CatchScene','TidyScene','CarScene']):
            point=page.evaluate('(i)=>{const label=__testGame.scene.getScene("SelectScene").gameTiles[i].label;return {x:label.x,y:label.y};}',i)
            click(point['x'],point['y'])
            page.wait_for_function('(name)=>__testGame.scene.isActive(name)',arg=name,timeout=20000)
            page.wait_for_function('(name)=>__testGame.scene.getScene(name).children.list.some(o=>o.type === "Zone" && o.depth === 221)',arg=name)
            assert page.evaluate('(name)=>{const s=__testGame.scene.getScene(name);return s.mode === "full" && s.characterId === "giraffe" && (name !== "MemoryScene" || s.level === 4);}',name)
            assert page.evaluate('()=>{const s=__testGame.sound;const request=s.add("request_ball"),thanks=s.add("thank_you_1");request.play();thanks.play();const result=!request.mute && thanks.mute;request.destroy();thanks.destroy();return result;}')
            if name != 'MemoryScene':
                assert page.evaluate('(name)=>otherSoundDestination(__testGame.scene.getScene(name)).gain.value === 0',name)
            if name == 'CarScene':
                page.screenshot(path=str(ROOT/f'tests/artifacts/drive-{suffix}.png'))
            print('PASS: launched',name,flush=True)
            click(670,60)
            page.wait_for_function('()=>__testGame.scene.isActive("SelectScene")')
        start('MiniGameSelectScene', {'characterId':'giraffe'})
        assert page.evaluate('()=>MINIGAMES.map(g=>g.id).join(",")') == 'memory,catch,tidy,car'
        click(180,1280*.35+252*.70)
        page.wait_for_function('()=>__testGame.scene.isActive("MemoryScene")', timeout=20000)
        assert page.evaluate('()=>{const s=__testGame.scene.getScene("MemoryScene");return s.mode === "mini" && s.level === 3;}')
        page.wait_for_function('()=>__testGame.scene.getScene("MemoryScene").input._list.some(o=>o.depth===81)')
        click(670,60)
        page.wait_for_function('()=>__testGame.scene.isActive("PlayScene")')
        assert page.evaluate('()=>__testGame.scene.getScene("PlayScene").characterId === "giraffe"')
        assert page.evaluate('localStorage.getItem("tcm_memory_level")') == '4'
        # Every mini game and its selection menu return to care on a child tap.
        for name in ['CatchScene','TidyScene','CarScene','MiniGameSelectScene']:
            start(name, {'characterId':'giraffe','mode':'mini'})
            click(670,60)
            page.wait_for_function('()=>__testGame.scene.isActive("PlayScene")')
            print('PASS: mini exit',name,flush=True)
        start('SelectScene', {'characterId':'giraffe'})
        toggle(True);toggle(False)
        assert page.evaluate('()=>readSoundSettings().requests && !readSoundSettings().other')
        page.reload()
        page.wait_for_function('()=>__testGame.scene.isActive("SelectScene")')
        assert page.evaluate('()=>readSoundSettings().volume === .6 && readSoundSettings().requests && !readSoundSettings().other')
        assert page.evaluate('()=>__testGame.scene.getScene("SelectScene").characterId === "giraffe"')
        assert page.evaluate('localStorage.getItem("tcm_memory_level")') == '4'
        assert not errors,errors
        print('PASS:',suffix,'Home launches, plushie choice, settings hold/cancel/shield, volume, independent categories after play(), synth gating, one-tap full/mini exits and reload persistence',flush=True)
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
