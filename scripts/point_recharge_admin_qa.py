"""Mocked admin API acceptance; does not modify any real configuration or order."""
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright, expect

out = Path(__file__).resolve().parent.parent / 'artifacts' / 'point-recharge'
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as pw:
    browser = pw.chromium.launch()
    context = browser.new_context(viewport={'width':1440,'height':1000})
    context.add_init_script("localStorage.setItem('token','fixture')")
    config = {'unitPrice':1,'pointsPerUnit':100,'maxQuantity':1000,'status':1}
    writes = []
    def route_api(route):
        if not urlparse(route.request.url).path.startswith('/api/'):
            route.continue_(); return
        path = route.request.url.split('/api',1)[1].split('?')[0]
        data = None
        if path == '/user/get/login': data = {'id':'10','userRole':'admin','userName':'测试管理员'}
        elif path == '/point/recharge-config': data = config
        elif path == '/point/recharge-config/update':
            data = route.request.post_data_json
            writes.append(data); config.update(data)
        elif path == '/point/admin/check-in-config': data = {'id':'1','rewardPoints':20,'status':1}
        elif path == '/member/order/list/page':
            data = {'records':[{'id':'101','orderNo':'MEM-RECHARGE-QA','userId':'10','userName':'测试用户','planType':'points','orderType':'point_recharge','orderStatus':'completed','orderAmount':3,'rechargeQuantity':3,'pointsAmount':300,'paymentChannel':'alipay'}],'total':1}
        elif 'list' in path: data = {'records':[],'total':0}
        route.fulfill(json={'code':0,'data':data})
    context.route('**/api/**', route_api)
    page = context.new_page()
    page.on('pageerror', lambda e: print(str(e)))
    page.goto('http://127.0.0.1:5182/point')
    expect(page.get_by_text('积分充值配置',exact=True)).to_be_visible()
    page.get_by_role('spinbutton',name='每份价格（元）').fill('2.5')
    page.get_by_role('spinbutton',name='每份积分').fill('200')
    page.get_by_role('button',name='保存充值配置').click()
    expect(page.get_by_text('充值配置已保存',exact=True)).to_be_visible()
    assert writes == [{'unitPrice':2.5,'pointsPerUnit':200,'maxQuantity':1000,'status':1}]
    page.reload()
    expect(page.get_by_role('spinbutton',name='每份价格（元）')).to_have_value('2.50')
    page.screenshot(path=str(out/'admin-config.png'))
    page.goto('http://127.0.0.1:5182/member-order')
    expect(page.get_by_text('MEM-RECHARGE-QA',exact=True)).to_be_visible()
    expect(page.get_by_role('cell',name='300',exact=True)).to_be_visible()
    expect(page.get_by_role('cell',name='3',exact=True)).to_be_visible()
    page.screenshot(path=str(out/'admin-orders.png'))
    browser.close()
print('Passed: admin configuration save/reload, recharge order quantity/points display')
