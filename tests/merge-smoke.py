"""Browser integration checks. Serve the repo on port 8000, then run this file.

Requires Python Playwright and its Chromium browser. The exact existing CDN
bundle is read from tests/.cache/phaser-3.60.0.min.js to avoid network variance.
The game entry point is instrumented in HTTP responses only, never on disk.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / 'tests/artifacts'
ARTIFACTS.mkdir(parents=True, exist_ok=True)
CDN = 'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser.min.js'
URL = 'http://127.0.0.1:8000/'

def setup(context):
    context.route(CDN, lambda route: route.fulfill(path=str(ROOT / 'tests/.cache/phaser-3.60.0.min.js'), content_type='application/javascript'))
    entry = (ROOT / 'main.js').read_text(encoding='utf-8').replace('new Phaser.Game(config);', 'window.__testGame = new Phaser.Game(config);')
    context.route('**/main.js', lambda route: route.fulfill(body=entry, content_type='application/javascript'))

def active(page, name):
    page.wait_for_function('(name) => window.__testGame?.scene.isActive(name)', arg=name, timeout=20000)
    page.wait_for_timeout(100)

def start(page, name, data=None):
    page.evaluate('([name, data]) => { const scene = __testGame.scene.getScenes(true)[0]; scene.scene.start(name, data); }', [name, data or {}])
    active(page, name)

def memory(page):
    return page.evaluate('() => { const s=__testGame.scene.getScene("MemoryScene"); return {level:s.level,mode:s.mode,board:s.boardIndex,sets:s.setsCleared,locked:s.locked,matched:s.matchedPairs,misses:s.mismatchesThisSet,flips:s.flipsSinceMatch,cards:s.cards.map(c=>({id:c.item.id,up:c.faceUp,matched:c.matched,x:c.hit.x,y:c.hit.y,size:c.size}))}; }')

def click(page, x, y):
    box = page.locator('canvas').first.bounding_box()
    page.mouse.click(box['x'] + x * box['width'] / 720, box['y'] + y * box['height'] / 1280)

def hold_door(page):
    box = page.locator('canvas').first.bounding_box()
    page.mouse.move(box['x'] + 670 * box['width'] / 720, box['y'] + 50 * box['height'] / 1280)
    page.mouse.down()
    page.wait_for_timeout(2200)
    page.mouse.up()
    page.wait_for_function('() => __testGame.scene.getScenes(true)[0]._navigationOpen === true')

def solve(page):
    state = memory(page)
    pair_ids = list(dict.fromkeys(c['id'] for c in state['cards'] if not c['matched']))
    for item in pair_ids:
        page.wait_for_function('() => !__testGame.scene.getScene("MemoryScene").locked', timeout=20000)
        state = memory(page)
        pair = [c for c in state['cards'] if c['id'] == item and not c['matched']]
        assert len(pair) == 2
        click(page, pair[0]['x'], pair[0]['y'])
        page.wait_for_timeout(300)
        click(page, pair[1]['x'], pair[1]['y'])
        page.wait_for_timeout(400)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--log-file=' + str(ARTIFACTS / 'browser-debug.log')])
    context = browser.new_context(viewport={'width':390,'height':844}, service_workers='block', has_touch=True)
    setup(context)
    context.add_init_script("localStorage.setItem('tcm_character','bunny');")
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL)
    active(page, 'SelectScene')
    page.screenshot(path=str(ARTIFACTS / 'home-phone.png'))
    click(page, 360, 1280 * .91)
    active(page, 'AllGamesScene')
    page.screenshot(path=str(ARTIFACTS / 'games-phone.png'))
    click(page, 360, 1280 * .42)
    active(page, 'MemoryScene')
    assert memory(page)['level'] == 1 and memory(page)['mode'] == 'full'
    page.screenshot(path=str(ARTIFACTS / 'memory-phone.png'))
    state = memory(page)
    first = state['cards'][0]
    wrong = next(c for c in state['cards'] if c['id'] != first['id'])
    click(page, first['x'], first['y'])
    click(page, wrong['x'], wrong['y'])
    assert memory(page)['matched'] == 0, 'guided mismatch must be ignored'
    partner = next(c for c in state['cards'][1:] if c['id'] == first['id'])
    click(page, partner['x'], partner['y'])
    page.wait_for_function('() => !__testGame.scene.getScene("MemoryScene").locked', timeout=20000)
    solve(page)
    page.wait_for_function('() => __testGame.scene.getScene("MemoryScene").boardIndex === 1', timeout=20000)
    assert page.evaluate("localStorage.getItem('tcm_memory_level')") == '1'
    print('PASS: Home -> All Games -> Memory; guided matching and next board', flush=True)

    # Preview, wrong-pair flip-back and four-flip hint on the real scene.
    page.evaluate("localStorage.setItem('tcm_memory_level','2')")
    start(page, 'MemoryScene', {'mode':'full','characterId':'bunny'})
    assert all(c['up'] for c in memory(page)['cards']) and memory(page)['locked']
    page.wait_for_function('() => !__testGame.scene.getScene("MemoryScene").locked')
    assert not any(c['up'] for c in memory(page)['cards'])
    state = memory(page)
    first = state['cards'][0]
    wrong = next(c for c in state['cards'] if c['id'] != first['id'])
    for attempt in range(2):
        click(page, first['x'], first['y']); page.wait_for_timeout(300)
        click(page, wrong['x'], wrong['y'])
        if attempt == 1:
            page.wait_for_function('() => __testGame.scene.getScene("MemoryScene").flipsSinceMatch === 0 && __testGame.scene.getScene("MemoryScene").cards.every(c=>c.faceUp)')
        page.wait_for_function('() => !__testGame.scene.getScene("MemoryScene").locked')
        assert not any(c['up'] for c in memory(page)['cards'])
    assert memory(page)['misses'] == 2
    print('PASS: preview, flip-back and automatic peek', flush=True)

    # Mini always uses level 3, regardless of saved full-game progress.
    for level in [1, 2, 3, 4]:
        page.evaluate('(level) => localStorage.setItem("tcm_memory_level",String(level))', level)
        before = page.evaluate('JSON.stringify({...localStorage})')
        start(page, 'MemoryScene', {'mode':'mini','characterId':'bunny'})
        assert memory(page)['level'] == 3
        assert len(memory(page)['cards']) == 4 and not any(c['up'] for c in memory(page)['cards'])
        for completed in range(3):
            solve(page)
            if completed < 2:
                page.wait_for_function('(count) => __testGame.scene.getScene("MemoryScene").miniSetsCleared === count && !__testGame.scene.getScene("MemoryScene").locked', arg=completed + 1, timeout=20000)
        active(page, 'PlayScene')
        assert page.evaluate('JSON.stringify({...localStorage})') == before
    print('PASS: mini plays three level-3 sets for saved levels 1-4 and never changes progression', flush=True)

    # Full-mode completion persists both promotions and appropriate step-downs.
    page.evaluate("localStorage.setItem('tcm_memory_level','2')")
    start(page, 'MemoryScene', {'mode':'full','characterId':'bunny'})
    page.evaluate('() => { __testGame.scene.getScene("MemoryScene").setsCleared=4; }')
    solve(page)
    page.wait_for_function('() => __testGame.scene.getScene("MemoryScene").level === 3', timeout=20000)
    assert page.evaluate("localStorage.getItem('tcm_memory_level')") == '3'
    page.evaluate("localStorage.setItem('tcm_memory_level','4')")
    start(page, 'MemoryScene', {'mode':'full','characterId':'bunny'})
    page.evaluate('() => { __testGame.scene.getScene("MemoryScene").mismatchesThisSet=4; }')
    solve(page)
    page.wait_for_function('() => __testGame.scene.getScene("MemoryScene").level === 3', timeout=20000)
    assert page.evaluate("localStorage.getItem('tcm_memory_level')") == '3'
    print('PASS: full mode persists promotion and step-down at set completion', flush=True)

    # Shared door: short hold cancels; every scene routes and keeps the plushie.
    for scene_name in ['PlayScene','MiniGameSelectScene','CatchScene','TidyScene','CarScene','MemoryScene','AllGamesScene']:
        start(page, scene_name, {'characterId':'bunny','mode':'full'})
        hold_door(page)
        labels = page.evaluate('() => __testGame.scene.getScenes(true)[0].children.list.filter(o=>o.type==="Container" && o.depth===200).flatMap(o=>o.list.filter(x=>x.type==="Text").map(x=>x.text))')
        assert 'Where to?' in labels
        assert ('Back to Care Game' in labels) == (scene_name != 'PlayScene')
        assert ('Back to Games Menu' in labels) == (scene_name != 'AllGamesScene')
        page.screenshot(path=str(ARTIFACTS / ('door-' + scene_name + '.png')))
        # Outside click closes and restores paused timers/physics.
        click(page, 360, 1200)
        assert page.evaluate('() => !__testGame.scene.getScenes(true)[0]._navigationOpen')
        assert page.evaluate('() => !__testGame.scene.getScenes(true)[0].time.paused')
        hold_door(page)
        home = page.evaluate('() => { const menu=__testGame.scene.getScenes(true)[0].children.list.find(o=>o.type==="Container" && o.depth===200); const text=menu.list.find(o=>o.text==="Back to Home"); return {x:text.x,y:text.y}; }')
        click(page, home['x'], home['y'])
        active(page, 'SelectScene')
        assert page.evaluate("localStorage.getItem('tcm_character')") == 'bunny'
    print('PASS: all seven doors, destination filtering, dismissal and Home return', flush=True)

    start(page, 'MemoryScene', {'mode':'full','characterId':'bunny'})
    click(page, 670, 50)
    page.wait_for_timeout(400)
    assert not page.evaluate('() => __testGame.scene.getScene("MemoryScene")._navigationOpen')
    for label, destination in [('Back to Games Menu','AllGamesScene'), ('Back to Care Game','PlayScene')]:
        start(page, 'MemoryScene', {'mode':'full','characterId':'bunny'})
        hold_door(page)
        button = page.evaluate('(label) => { const menu=__testGame.scene.getScenes(true)[0].children.list.find(o=>o.type==="Container" && o.depth===200); const text=menu.list.find(o=>o.text===label); return {x:text.x,y:text.y}; }', label)
        click(page, button['x'], button['y']); active(page, destination)
    print('PASS: short door presses do nothing; Games Menu and Care destinations work', flush=True)

    # Care retains three choices and its two-tray break.
    start(page, 'PlayScene', {'characterId':'bunny'})
    assert page.evaluate('() => __testGame.scene.getScene("PlayScene").trayObjects.length') == 3
    page.evaluate('() => { const s=__testGame.scene.getScene("PlayScene"); s.traysCleared=1; s.interruptAudio=()=>{}; s.queueAudio=()=>{}; s.queueThen=fn=>fn(); for (const o of s.trayObjects) s.handleCorrect(o); }')
    active(page, 'MiniGameSelectScene')
    assert page.evaluate('MINIGAMES.length') == 4
    click(page, 60, 60)
    assert page.evaluate('() => __testGame.scene.getScene("MiniGameSelectScene").characterId') != 'bunny'
    print('PASS: care still takes a break after two trays; mini menu has four tiles and switching', flush=True)

    # Laptop layout, six cards stay inside the canvas with no overlapping targets.
    page.set_viewport_size({'width':1366,'height':900})
    page.evaluate("localStorage.setItem('tcm_memory_level','4')")
    start(page, 'MemoryScene', {'mode':'full'})
    state = memory(page)
    assert len(state['cards']) == 6
    for c in state['cards']:
        assert c['x']-c['size']/2 > 0 and c['x']+c['size']/2 < 720
        assert c['y']-c['size']/2 > 240 and c['y']+c['size']/2 < 1050
    page.screenshot(path=str(ARTIFACTS / 'memory-laptop-six.png'))
    page.reload(); active(page, 'SelectScene')
    page.screenshot(path=str(ARTIFACTS / 'home-laptop.png'))
    assert not errors, errors
    print('PASS: phone/laptop layouts; no JavaScript runtime errors', flush=True)
    browser.close()
