// Run with Playwright installed (or NODE_PATH pointing to its node_modules).
const { chromium } = require('playwright');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../web-admin/dist');
const out = path.resolve(__dirname, '../artifacts/community-qa');
fs.mkdirSync(out, { recursive: true });
const id = '9007199254740993';
const category = { id: '9007199254740994', name: '网站更新', enabled: 1, sort: 0, description: '', postCount: '1' };
const tag = { ...category, id: '9007199254740995', name: '插件' };
const markdown = '# 更新说明\n\n- 教程新增章节\n- 新插件上架\n\n![加载失败提示](https://media.test/broken.png)\n\n```video\nhttps://media.test/demo.mp4\n```\n\n<script>window.communityXss = true</script>\n\n[危险链接](javascript:alert(1))';
let saved, lastSave, lastSort, lastReply, lastModeration, lastReport, termSave;
const comment = { id: '9007199254740996', postId: id, content: '教程很有帮助！', authorName: '读者甲', userId: '888', official: 0, hidden: 0, postDeleted: 0, postStatus: 'published', postTitle: '网站更新', createTime: '2026-09-05 22:00:00' };
const report = { id: '9007199254740997', commentId: comment.id, userId: '889', postId: id, postTitle: '网站更新', content: comment.content, reason: '疑似广告', hidden: 0, status: 'pending', createTime: comment.createTime };
const terms = [tag];
function postRow() { return { ...saved.draft, id, status: saved.status, version: saved.version, categoryName: category.name, tags: terms, firstPublishedAt: saved.firstPublishedAt, hasUnpublishedChanges: String(Number(saved.hasUnpublishedChanges)), likeCount: '2', commentCount: '3', popularity: '5' }; }
async function main() {
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(root, 'index.html');
    res.setHeader('Content-Type', { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream');res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(4177, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true });
  const results = [], errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
    await context.addInitScript(() => localStorage.setItem('token', 'isolated-qa-token'));
    await context.route('https://media.test/**', route => route.fulfill({ status: 404, body: '' }));
    await context.route('**/api/**', async route => {
      const req = route.request(), p = new URL(req.url()).pathname;
      const body = req.method() === 'POST' && req.headers()['content-type']?.includes('application/json') ? req.postDataJSON() : {};
      let data = true;
      if (p === '/api/user/get/login') data = { id: '1', userRole: 'admin', userName: '管理员' };
      else if (p === '/api/community/admin/taxonomy/category') data = [category];
      else if (p === '/api/community/admin/taxonomy/tag') data = terms;
      else if (p.endsWith('/taxonomy/tag/save')) { termSave = body; data = '9007199254740998'; terms.push({ ...body, id: data, postCount: '0' }); }
      else if (p.endsWith('/taxonomy/category/save')) { termSave = body; data = category.id; }
      else if (p.endsWith('/post/list/page')) { lastSort = body.sort; data = { records: saved ? [postRow()] : [], total: saved ? '1' : '0' }; }
      else if (p.endsWith('/post/get')) data = saved;
      else if (p.endsWith('/post/save')) {
        lastSave = body; assert.equal(typeof body.categoryId, 'string');
        if (body.id) assert.equal(body.id, id);
        saved = { ...saved, id, status: saved?.status || 'draft', version: (saved?.version || 0) + 1, draft: body, hasUnpublishedChanges: 1 }; data = saved;
      }
      else if (p.endsWith('/post/publish')) { assert.equal(body.id, id); saved.status = 'published'; saved.published = { ...saved.draft }; saved.hasUnpublishedChanges = 0; saved.version++; saved.firstPublishedAt ||= '2026-09-05 22:00:00'; }
      else if (p.endsWith('/post/announcement')) { assert.equal(body.id, id); data = '9007199254740999'; }
      else if (p.endsWith('/comment/list/page')) data = { records: [comment], total: '1' };
      else if (p.endsWith('/comment/add')) { lastReply = body; data = '9007199254741000'; }
      else if (p.endsWith('/comment/moderate')) { lastModeration = body; comment.hidden = body.hidden; report.hidden = body.hidden; }
      else if (p.endsWith('/report/list/page')) data = { records: [report], total: '1' };
      else if (p.endsWith('/report/resolve')) { lastReport = body; report.status = 'resolved'; report.resolution = body.resolution; }
      else if (p === '/api/file/upload') data = new URL(req.url()).searchParams.get('biz') === 'blog_video' ? 'https://media.test/uploaded.mp4' : 'https://media.test/uploaded.png';
      else if (p.endsWith('/list/page')) data = { records: [], total: '0' };
      await route.fulfill({ json: { code: 0, data, message: 'ok' } });
    });
    const page = await context.newPage();page.on('pageerror', e => errors.push(e.message));
    await page.goto('http://127.0.0.1:4177/community/posts');
    await page.getByRole('button', { name: '新建帖子', exact: true }).click();
    const drawer = page.locator('.ant-drawer-content');
    await drawer.getByLabel('标题', { exact: true }).fill('九月教程和插件更新');
    await drawer.getByLabel('摘要', { exact: true }).fill('新增教程章节、插件及使用说明');
    await drawer.getByLabel('主分类（发布时必选）').click();
    await page.locator('.ant-select-item-option').filter({ hasText: '网站更新' }).click();
    await drawer.locator('input[type=file]').nth(0).setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('fixture') });
    await page.waitForFunction(() => document.querySelector('#community-post-editor_coverUrl')?.value.includes('uploaded.png'));
    await drawer.locator('input[type=file]').nth(1).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: Buffer.from('fixture') });
    await page.waitForFunction(() => document.querySelector('#community-post-editor_markdown')?.value.includes('uploaded.png'));
    await drawer.locator('input[type=file]').nth(2).setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.from('fixture') });
    await page.waitForFunction(() => document.querySelector('#community-post-editor_markdown')?.value.includes('```video'));
    await drawer.locator('input[type=file]').nth(3).setInputFiles({ name: 'article.md', mimeType: 'text/markdown', buffer: Buffer.from(markdown) });
    await page.locator('.ant-modal-confirm-title').filter({ hasText: '用导入内容替换当前正文？' }).waitFor();
    await page.locator('.ant-modal').getByRole('button', { name: /确.*定|OK/ }).click();
    await page.waitForFunction(value => document.querySelector('#community-post-editor_markdown')?.value === value, markdown);
    await drawer.getByRole('button', { name: '新增标签', exact: true }).click();
    await page.getByRole('textbox', { name: '新标签名称' }).fill('教程更新');
    await page.locator('.ant-modal').getByRole('button', { name: /确.*定/ }).click();
    await page.waitForFunction(() => !document.querySelector('.ant-modal:not([style*="display: none"])'));
    assert.equal(termSave.name, '教程更新');
    await drawer.getByRole('button', { name: '关闭', exact: true }).click();
    await page.locator('.ant-modal-confirm-title').filter({ hasText: '放弃尚未保存的修改？' }).waitFor();
    await page.locator('.ant-modal').getByRole('button', { name: /取.*消|Cancel/ }).click();
    await drawer.getByText('加载失败提示', { exact: true }).waitFor();
    const video = drawer.locator('video');
    // Failed media must fall back to its original HTTPS link; successful elements have controls, never autoplay.
    await drawer.getByText('视频暂时无法播放，打开原视频').waitFor();
    assert.equal(await drawer.locator('a').filter({ hasText: '危险链接' }).getAttribute('href'), '');
    assert.equal(await page.evaluate(() => window.communityXss), undefined);
    assert.equal(await drawer.locator('script').count(), 0);
    const downloadPromise = page.waitForEvent('download');await drawer.getByRole('button', { name: '导出 Markdown' }).click();
    const download = await downloadPromise;const downloadPath = await download.path();assert.equal(fs.readFileSync(downloadPath, 'utf8'), markdown);
    fs.writeFileSync(path.join(out, 'accessibility.txt'), await drawer.ariaSnapshot());
    await drawer.locator('button').filter({ hasText: '保存草稿' }).click();
    await drawer.locator('.ant-drawer-title').filter({ hasText: '编辑帖子' }).waitFor();
    assert.equal(lastSave.markdown, markdown);assert.equal(lastSave.tagIds[0], '9007199254740998');
    await drawer.getByRole('button', { name: /^发\s*布$/ }).click();
    await page.locator('.ant-popconfirm').getByRole('button', { name: /确.*定|Yes|OK/ }).click();
    await drawer.getByRole('tab', { name: '线上版本' }).waitFor();
    await page.waitForFunction(id => {
      const row = document.querySelector(`tr[data-row-key="${id}"]`);
      return row?.textContent.includes('已发布') && !row.textContent.includes('有未发布修改')
        && [...row.querySelectorAll('button')].find(b => b.textContent.replace(/\s/g, '') === '发布')?.disabled;
    }, id);
    const oldSource = saved.published.markdown;
    await drawer.getByLabel('Markdown 正文').fill('# 新版尚未发布');
    assert.equal(await drawer.getByRole('button', { name: /^发\s*布$/ }).isDisabled(), true);
    await drawer.locator('button').filter({ hasText: '保存草稿' }).click();
    await page.waitForTimeout(300);assert.equal(saved.published.markdown, oldSource);
    await page.screenshot({ path: path.join(out, 'post-editor-desktop.png'), fullPage: true });
    results.push('创建、分类、多标签、媒体上传、原文导入导出、安全预览、放弃修改确认、发布及旧版保留');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(out, 'post-editor-mobile.png'), animations: 'disabled' });
    const overflow = await drawer.evaluate(el => el.scrollWidth > el.clientWidth + 2);assert.equal(overflow, false);
    await page.keyboard.press('Escape');await drawer.waitFor({ state: 'hidden' });
    results.push('手机编辑布局及 Esc 关闭');
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.locator('.ant-select[aria-label="帖子排序"]').click();await page.locator('.ant-select-item-option').filter({ hasText: '最受欢迎' }).click();
    await page.waitForTimeout(350);assert.equal(lastSort, 'popular');
    await page.getByRole('button', { name: '生成公告', exact: true }).click();await page.locator('.ant-modal-confirm-title').filter({ hasText: '已生成系统公告草稿' }).waitFor();
    await page.locator('.ant-modal').getByRole('button', { name: '查看系统公告' }).click();
    results.push('热门排序及生成公告草稿');
    await page.goto(`http://127.0.0.1:4177/community/comments?postId=${id}`);
    await page.getByRole('button', { name: /^回\s*复$/ }).click();await page.getByRole('textbox', { name: '官方回复内容' }).fill('感谢反馈，新章节已经上线。');
    await page.locator('.ant-modal').getByRole('button', { name: /确.*定/ }).click();await page.waitForTimeout(300);
    assert.equal(lastReply.replyToId, comment.id);assert.equal(lastReply.postId, id);assert.match(lastReply.requestKey, /^[a-zA-Z0-9-]+$/);
    await page.getByRole('button', { name: /^隐\s*藏$/ }).click();await page.locator('.ant-popconfirm').getByRole('button', { name: /确.*定|Yes|OK/ }).click();
    await page.waitForTimeout(300);assert.equal(lastModeration.hidden, true);
    await page.getByRole('tab', { name: '举报处理' }).click();await page.getByRole('button', { name: '处理完成', exact: true }).click();
    await page.getByRole('textbox', { name: '举报处理说明' }).fill('已核实并隐藏评论。');await page.locator('.ant-modal').getByRole('button', { name: /确.*定/ }).click();
    await page.waitForTimeout(300);assert.equal(lastReport.id, report.id);
    await page.screenshot({ path: path.join(out, 'comment-reports.png'), fullPage: true });
    results.push('官方回复、隐藏评论、举报处理及字符串 ID');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ passed: results, pageErrors: errors }, null, 2));
    console.log(JSON.stringify({ passed: results, pageErrors: errors }, null, 2));
  } catch(error) {
    for (const context of browser.contexts()) for (const page of context.pages()) {
      await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true });
      fs.writeFileSync(path.join(out, 'failure.txt'), page.url() + '\n' + await page.locator('body').innerText() + '\n' + JSON.stringify(errors));
    }
    throw error;
  } finally { await browser.close();await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error);process.exitCode = 1; });
