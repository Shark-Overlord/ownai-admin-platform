"""Local browser QA with intercepted APIs and checkout: no real payment or account mutations."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

OUT = Path(__file__).resolve().parent.parent / 'design-qa-assets' / 'point-recharge'
OUT.mkdir(parents=True, exist_ok=True)
checks = []
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    for theme, width in [('dark', 1280), ('dark', 390), ('light', 1280), ('light', 390)]:
        context = browser.new_context(viewport={'width': width, 'height': 900})
        user = {'id':'10', 'userName':'测试用户', 'memberLevel':'normal', 'pointBalance':20}
        context.add_init_script("localStorage.setItem('theme',%s);localStorage.setItem('preferred-locale','zh-CN');localStorage.setItem('designcollect-login-token','fixture');localStorage.setItem('designcollect-login-user',%s)" % (json.dumps(theme), json.dumps(json.dumps(user))))
        config = {'unitPrice':1,'pointsPerUnit':100,'maxQuantity':10,'status':1}
        orders = []
        state = {'changed':False}
        def handle(route):
            path = route.request.url.split('/api',1)[1].split('?')[0]
            data = None
            if path == '/point/recharge-config': data = config
            elif path == '/member-price-config/plans':
                data = [{'id':str(i),'planType':p,'cashPrice':v,'status':1} for i,p,v in [(1,'month',29),(2,'year',199),(3,'lifetime',399)]]
            elif path == '/user/get/login': data = user
            elif path == '/member/payment/create':
                body = route.request.post_data_json
                assert body['quantity'] == 3 and body['planType'] == 'points'
                assert body['expectedUnitPrice'] == 2.5 and body['expectedPointsPerUnit'] == 200
                orders.append(body)
                if state['changed']:
                    config['unitPrice'] = 3
                    route.fulfill(json={'code':50001,'message':'积分充值价格已更新，请刷新后重新确认'}); return
                data = {'orderNo':'MEM-QA','orderStatus':'pending','paymentChannel':'alipay',
                        'paymentFormHtml':'<form action="http://127.0.0.1:5181/checkout-fixture" method="post"><input name="fixture" value="true"></form>'}
            elif path == '/member/payment/status':
                data = {'orderNo':'MEM-QA','orderStatus':'completed','orderType':'point_recharge','pointsAmount':600,'pointBalance':620,'memberActive':False,'paymentChannel':'alipay'}
            elif 'unread' in path: data = 0
            elif 'list' in path: data = {'records':[], 'total':0}
            route.fulfill(json={'code':0,'data':data})
        context.route('**/api/**', handle)
        context.route('**/checkout-fixture', lambda r:r.fulfill(body='Simulated checkout',content_type='text/html'))
        page = context.new_page()
        errors = []
        page.on('pageerror', lambda e:errors.append(str(e)))
        page.goto('http://127.0.0.1:5181/#/pricing')
        card = page.get_by_role('region',name='充值积分')
        expect(card.get_by_text('¥1.00',exact=True)).to_be_visible()
        page.screenshot(path=str(OUT/f'default-{theme}-{width}.png'))
        config['unitPrice'] = 2.5; config['pointsPerUnit'] = 200
        page.reload()
        expect(card.get_by_text('¥2.50',exact=True)).to_be_visible()
        qty = card.get_by_role('spinbutton',name='购买份数')
        for invalid in ['0','-1','1.5','11','']:
            qty.fill(invalid)
            expect(card.get_by_role('button',name='支付宝支付')).to_be_disabled()
        qty.fill('2'); card.get_by_role('button',name='增加份数').click()
        expect(qty).to_have_value('3')
        expect(card.get_by_text('600 积分',exact=True)).to_be_visible()
        pay = card.get_by_role('button',name='支付宝支付 ¥7.50',exact=True)
        expect(pay).to_be_enabled()
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
        page.screenshot(path=str(OUT/f'{theme}-{width}.png'))
        with context.expect_page() as popup:
            pay.click()
        checkout = popup.value
        expect(checkout).to_have_url('http://127.0.0.1:5181/checkout-fixture')
        assert len(orders) == 1
        checkout.close()
        page.goto('http://127.0.0.1:5181/#/pricing/payment-result?orderNo=MEM-QA')
        expect(page.get_by_role('heading',name='积分充值成功')).to_be_visible()
        expect(page.get_by_text('已到账 600 积分')).to_be_visible()
        saved = page.evaluate("JSON.parse(localStorage.getItem('designcollect-login-user'))")
        assert saved['pointBalance'] == 620 and saved['memberLevel'] == 'normal'
        assert page.evaluate("sessionStorage.getItem('ownai:alipay:order:MEM-QA')") is None
        page.goto('http://127.0.0.1:5181/#/pricing')
        qty.fill('3'); state['changed'] = True
        card.get_by_role('button',name='支付宝支付 ¥7.50').click()
        expect(card.get_by_role('button',name='支付宝支付 ¥9.00')).to_be_visible()
        assert len(orders) == 2  # no automatic purchase after a changed quote
        assert not errors, errors
        checks.append(f'{theme}-{width}: quote, quantity, checkout, receipt, price-change')
        context.close()
    browser.close()
(OUT/'results.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(checks,ensure_ascii=False))
