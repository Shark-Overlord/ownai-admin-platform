"""Read-only, unauthenticated production smoke checks. Never creates production fixtures."""
import concurrent.futures
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen

root = Path(__file__).resolve().parent.parent
asset = re.search(r'src="(/assets/[^\"]+\.js)"', (root / 'web-admin/dist/index.html').read_text()).group(1)
checks = [
    ('/community/post/list/page', {'current': 1, 'pageSize': 10, 'sort': 'latest'}, 0),
    ('/community/post/list/page', {'current': 1, 'pageSize': 10, 'sort': 'popular'}, 0),
    ('/community/taxonomy/category', None, 0), ('/community/taxonomy/tag', None, 0),
    ('/community/post/get?id=1', None, 40400),
    ('/community/comment/list/page', {'postId': '1'}, 40400),
    ('/community/like', {'postId': '1', 'liked': True}, 40100),
    ('/community/comment/add', {'postId': '1', 'content': 'not submitted', 'requestKey': 'unauthenticated-check'}, 40100),
    ('/community/report', {'commentId': '1', 'reason': 'not submitted'}, 40100),
    ('/community/admin/post/list/page', {}, 40100),
    ('/community/admin/taxonomy/category', None, 40100),
    ('/news/list/page', {'current': 1, 'pageSize': 10}, 0),
    ('/news/popup/candidate', {'ids': []}, 0), ('/user/get/login', None, 40100),
]

def check(item):
    route, body, expected = item
    req = Request('https://admin.ownai.icu/api' + route,
                  data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
    with urlopen(req, timeout=25) as response:
        result = json.load(response)
    return {'path': route, 'code': result['code'], 'expected': expected, 'passed': result['code'] == expected}

with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    results = list(executor.map(check, checks))
for route in ['/community/posts', '/community/comments', '/announcement', asset]:
    with urlopen('https://admin.ownai.icu' + route, timeout=30) as response:
        content = response.read()
        passed = response.status == 200 and (route.endswith('.js') or asset.encode() in content)
        results.append({'path': route, 'http': response.status, 'passed': passed})
(root / 'artifacts/community-live-checks.json').write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding='utf-8')
failed = [item for item in results if not item['passed']]
print(json.dumps({'passed': len(results) - len(failed), 'failed': failed}, ensure_ascii=False))
if failed:
    raise SystemExit(1)
