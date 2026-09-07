"""Browser acceptance with intercepted APIs only: never creates real orders or debits.
Run: python scripts/prompt_unlock_qa.py (Vite on 127.0.0.1:5181).
"""
import base64
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).resolve().parent.parent / 'design-qa-assets' / 'points-unlock'
OUT.mkdir(parents=True, exist_ok=True)
ID = '9007199254740993'
checks = []
with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True)
    for name, initial, theme, mobile, fail_response in [
        ('ordinary', 100, 'light', False, False),
        ('insufficient', 20, 'dark', True, False),
        ('desktop-insufficient', 20, 'dark', False, False),
        ('lost-response', 200, 'dark', False, True),
        ('mobile-success', 100, 'light', True, False),
        ('price-changed', 300, 'light', False, False),
        ('checkin-success', 99, 'dark', True, False),
        ('member', 100, 'light', False, False),
        ('free', 100, 'light', False, False),
        ('guest', 0, 'light', False, False),
        ('detail-entry', 100, 'dark', False, False),
        ('source-entry', 100, 'light', False, False),
    ]:
        context = browser.new_context(viewport={'width':390,'height':844} if mobile else {'width':1280,'height':900}, permissions=['clipboard-read','clipboard-write'])
        context.add_init_script("""([theme]) => {
          localStorage.setItem('theme',theme);
          localStorage.setItem('preferred-locale','zh-CN');
          localStorage.setItem('designcollect-login-token','fixture-token');
          localStorage.setItem('designcollect-login-user',JSON.stringify({id:'10',userName:'测试用户',memberLevel:'normal',pointBalance:100}));
        }""".replace('([theme]) =>', '(() =>').replace("localStorage.setItem('theme',theme);", f"localStorage.setItem('theme','{theme}');") + ')()')
        if name == 'guest':
            context.add_init_script("localStorage.removeItem('designcollect-login-user');localStorage.removeItem('designcollect-login-token');")
        state = {'balance':initial, 'unlocked':False, 'orders':0, 'price':100, 'details':0}
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda error: errors.append(str(error)))

        def route_api(route):
            path = route.request.url.split('/api',1)[-1].split('?')[0]
            item = {'id':ID,'title':'积分解锁测试作品','memberOnly':0 if name == 'free' else 1,'pointsPrice':state['price'],
                    'canAccess':state['unlocked'] or name in ('member','free'),'canAccessPrompt':state['unlocked'] or name in ('member','free'),
                    'permanentlyUnlocked':state['unlocked'],'hasSourceCode':True,
                    'category':{'id':'2071608263790104578','name':'前端组件'},'tagList':[],
                    'coverUrl':'https://fixture.invalid/cover.png','imageWidth':800,'imageHeight':600}
            data = None
            if path == '/artwork/detail':
                state['details'] += 1
                data = {**item, 'promptContent':'test prompt secret' if state['unlocked'] else None,
                        'accessReason':'permanent_unlock' if state['unlocked'] else 'member_required'}
            elif path == '/point/me': data = {'pointBalance':state['balance']}
            elif path == '/point/check-in/status': data = {'pointBalance':state['balance'],'rewardPoints':20,'status':1,'checkedInToday':False}
            elif path == '/point/check-in':
                state['balance'] += 20
                data = {'pointBalance':state['balance']}
            elif path == '/order/create':
                payload = route.request.post_data_json
                assert payload['artworkId'] == ID and isinstance(payload['artworkId'],str)
                assert payload['orderType'] == 'points' and payload['expectedPointsPrice'] == state['price']
                assert state['balance'] >= state['price']
                state['orders'] += 1
                state['balance'] -= state['price']; state['unlocked'] = True
                if fail_response:
                    route.abort('failed'); return
                data = {'id':'9007199254740995','artworkId':ID}
            elif path == '/artwork/get/vo': data = 'test prompt secret' if state['unlocked'] else None
            elif path == '/artwork/source/download':
                assert state['unlocked']
                route.fulfill(body=b'PK\x03\x04fixture',content_type='application/zip'); return
            elif path == '/artwork/home/overview': data = {'totalCount':1,'recentThreeDaysCount':1,'recentItems':[item]}
            elif path.endswith('/list/page/vo'): data = {'records':[item], 'total':1,'pages':1,'current':1}
            elif 'category' in path: data = [{'id':'2071608263790104578','name':'前端组件','children':[]}]
            elif path.endswith('/get/login'): data = {'id':'10','userName':'测试用户','memberLevel':'normal','pointBalance':state['balance']}
            elif 'unread' in path: data = 0
            elif 'list' in path: data = {'records':[],'total':0}
            elif 'favorite' in path: data = False
            route.fulfill(json={'code':0,'data':data,'message':'ok'})

        page.route('**/api/**',route_api)
        page.route('https://fixture.invalid/**',lambda r:r.fulfill(content_type='image/png',body=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==')))
        page.goto('http://127.0.0.1:5181/frontend-prompts' if name in ('ordinary','detail-entry','source-entry') else f'http://127.0.0.1:5181/frontend-prompts?unlockArtwork={ID}')
        if name == 'ordinary':
            page.get_by_role('button',name='积分解锁',exact=True).click()
        if name == 'detail-entry':
            page.get_by_role('button',name='查看 积分解锁测试作品',exact=True).click()
            page.get_by_role('button',name='积分永久解锁',exact=True).click()
        if name == 'source-entry':
            page.get_by_role('button',name='解锁源码',exact=True).click()
        if name == 'guest':
            expect(page).to_have_url('http://127.0.0.1:5181/auth/login')
            assert f'unlockArtwork={ID}' in page.evaluate('history.state.usr.redirectTo')
            assert state['orders'] == 0
            checks.append(name);context.close();continue
        if name in ('member','free'):
            expect(page.get_by_role('button',name='复制',exact=True)).to_be_visible()
            expect(page.get_by_role('dialog',name='永久解锁作品')).not_to_be_visible()
            assert state['orders'] == 0
            checks.append(name);context.close();continue
        dialog = page.get_by_role('dialog',name='永久解锁作品')
        expect(dialog).to_be_visible()
        expect(dialog.locator('.prompt-unlock-summary > div').filter(has_text='当前余额')).to_contain_text(f'{initial} 积分')
        assert state['orders'] == 0
        page.screenshot(path=str(OUT/f'{name}.png'),full_page=True)
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        confirm = dialog.locator('.prompt-unlock-primary')
        if name in ('insufficient', 'desktop-insufficient'):
            expect(confirm).to_be_disabled()
            expect(dialog.locator('.prompt-unlock-total')).to_contain_text('80 积分')
            expect(confirm).to_have_text('积分不足')
            page.keyboard.press('Escape')
            expect(dialog).not_to_be_visible()
            assert state['orders'] == 0
            checks.append(name); context.close(); continue
        if name == 'checkin-success':
            expect(confirm).to_be_disabled()
            dialog.get_by_role('button',name='签到 +20',exact=True).click()
            expect(confirm).to_be_enabled()
            initial += 20
        if name == 'ordinary':
            page.keyboard.press('Escape')
            expect(dialog).not_to_be_visible()
            expect(page.get_by_role('button',name='积分解锁',exact=True)).to_be_focused()
            page.get_by_role('button',name='积分解锁',exact=True).click()
            expect(confirm).to_be_enabled()
        if name == 'price-changed':
            state['price'] = 120
            confirm.click()
            expect(dialog.get_by_role('button',name='确认扣除 120 积分')).to_be_enabled()
            assert state['orders'] == 0
            confirm = dialog.get_by_role('button',name='确认扣除 120 积分')
        confirm.dblclick() if name == 'ordinary' else confirm.click()
        expect(dialog).not_to_be_visible()
        assert state['orders'] == 1
        expect(page.get_by_text('已永久解锁，可复制提示词和下载源码',exact=True)).to_be_visible()
        stored = page.evaluate("JSON.parse(localStorage.getItem('designcollect-login-user')).pointBalance")
        assert stored == initial-state['price'], stored
        # Reopening a permanently unlocked work checks access without charging again.
        page.goto(f'http://127.0.0.1:5181/frontend-prompts?unlockArtwork={ID}')
        expect(dialog).not_to_be_visible()
        assert state['orders'] == 1
        copy_button = page.get_by_role('button',name='复制',exact=True)
        expect(copy_button).to_be_visible()
        copy_button.click()
        expect(page.get_by_role('button',name='已复制',exact=True)).to_be_visible()
        assert page.evaluate('navigator.clipboard.readText()') == 'test prompt secret'
        with page.expect_download():
            page.get_by_role('button',name='下载源码',exact=True).click()
        assert state['orders'] == 1
        assert not errors, errors
        checks.append(name)
        context.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps({'passed':checks},ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'passed':checks},ensure_ascii=False))
