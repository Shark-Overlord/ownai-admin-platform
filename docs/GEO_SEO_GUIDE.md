# GEO / SEO 服务端注入说明

更新日期：2026-10-11。

`web-frontend` 是纯 CSR 应用，GPTBot、OAI-SearchBot、ClaudeBot、PerplexityBot、
Bytespider 等 AI 爬虫基本不执行 JavaScript，只能看到空的 `#root`。本功能由后端读取
已部署的 `index.html`，按路由注入标题、描述、canonical、JSON-LD 和可读正文，
所有 UA 拿到同一份 HTML（不按 UA 区分，避免 cloaking），React 挂载后用
`createRoot` 直接替换 `#root`。

## 1. 后端契约

| 接口 | 用途 | 失败行为 |
| --- | --- | --- |
| `GET /api/seo/render?path=<uri>` | 返回注入后的 HTML | 模板不可读返回 `503`；数据异常返回原始壳 `200` |
| `GET /api/seo/sitemap.xml` | 动态站点地图，含 `lastmod` | `503` |
| `GET /api/seo/llms.txt` | 动态 llms.txt（llmstxt.org 格式） | `503` |

已支持的路由：

| 路由 | head | `#root` 正文 | JSON-LD |
| --- | --- | --- | --- |
| `/` | 保留壳里的首页 meta | 站点介绍、核心页面、最新 12 条免费提示词、最新 10 篇免费教程 | 保留壳里的 WebSite/Organization |
| `/frontend-prompts` | 注入 | 全部免费提示词（上限 300）与会员提示词（上限 100）链接 | CollectionPage + ItemList + BreadcrumbList |
| `/prompts/:id` | 注入 | 封面、分类标签、摘要与说明；免费提示词附全文，会员提示词只给开通/解锁说明 | CreativeWork（`isAccessibleForFree`）+ BreadcrumbList |
| `/tutorials` | 注入 | 免费教程书与最新 50 篇免费文章 | CollectionPage + ItemList + BreadcrumbList |
| `/tutorials/books/:id` | 注入；会员书 `noindex` | 简介、章节与文章链接 | 免费书：Course + BreadcrumbList |
| `/tutorials/posts/:id` | 注入 | 面包屑、正文、上一篇/下一篇 | Article（含 `dateModified`）+ BreadcrumbList |

规则：

- 全部以匿名身份调用 `BlogFrontService`，会员或登录可见的文章直接返回原始壳，
  不会泄露正文。
- 提示词通过 `ArtworkService.getPublicArtworkSnapshot` 以匿名身份读取：只有
  `memberOnly=0` 的已发布作品会带 `promptContent`，不读 `sourceZipUrl`，也不增加
  `viewCount`。会员提示词公开的是效果图、摘要和说明，`index, follow`，sitemap 收录，
  llms.txt 只列免费提示词。未发布或已删除的作品返回 `404`。
- 不存在的文章或教程书返回 `404`，带 `noindex`，`#root` 保持为空，由前端渲染
  自己的不存在状态。
- 渲染结果在进程内缓存 5 分钟，sitemap 和 llms.txt 用到的公开目录缓存 10 分钟。
  `index.html` 按修改时间重新读取，前台发布后立即生效。
- HTML 响应带 `Cache-Control: no-cache`。`index.html` 引用的带哈希资源会在发布时
  被清理，所以浏览器和 Nginx 都不能长期缓存这份 HTML。
- 模板路径配置项是 `ownai.seo.index-path`（环境变量 `OWNAI_SEO_INDEX_PATH`）。
  生产默认值是 `/www/wwwroot/ownai/index.html`；本地 profile 使用
  `web-frontend/dist/index.html`，需要先执行 `npm run build`。

前端配合：`main.tsx` 在挂载前删除 `#ssr-structured-data` 和
`#ssr-fallback-style`，页面级 JSON-LD 继续由 `useDocumentMeta` 输出。

提示词库对匿名用户开放（`/frontend-prompts` 不再走 `ProtectedRoute`，
`/artwork/home/overview` 改为允许匿名）。`/prompts/:id` 与提示词库是同一个页面组件：
在库里点开作品时 URL 同步为 `/prompts/:id`，返回键关闭弹窗；直接打开该 URL 时在
提示词库上弹出详情，关闭后替换为 `/frontend-prompts`。收藏、复制会员提示词等操作
仍要求登录。

## 2. Nginx 配置

在 `/www/server/panel/vhost/nginx/ownai-docs.conf` 的 `server {}` 中添加，放在已有
正则 `location` 之前。这个文件需要 root 权限修改，改完先执行 `nginx -t`，再
`nginx -s reload`。

```nginx
# --- GEO: crawler-readable HTML from Spring Boot, static files as fallback ---
location = / {
    proxy_pass http://127.0.0.1:8011/api/seo/render?path=/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_connect_timeout 2s;
    proxy_read_timeout 5s;
    proxy_intercept_errors on;
    error_page 500 502 503 504 = @ownai_spa_shell;
}

location ~ ^/(tutorials(/(posts|books)/[0-9]+)?|frontend-prompts|prompts/[0-9]+)/?$ {
    proxy_pass http://127.0.0.1:8011/api/seo/render?path=$uri;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_connect_timeout 2s;
    proxy_read_timeout 5s;
    proxy_intercept_errors on;
    error_page 500 502 503 504 = @ownai_spa_shell;
}

location = /sitemap.xml {
    proxy_pass http://127.0.0.1:8011/api/seo/sitemap.xml;
    proxy_connect_timeout 2s;
    proxy_read_timeout 10s;
    proxy_intercept_errors on;
    error_page 500 502 503 504 = @ownai_static_file;
}

location = /llms.txt {
    proxy_pass http://127.0.0.1:8011/api/seo/llms.txt;
    proxy_connect_timeout 2s;
    proxy_read_timeout 10s;
    proxy_intercept_errors on;
    error_page 500 502 503 504 = @ownai_static_file;
}

location @ownai_spa_shell {
    root /www/wwwroot/ownai;
    add_header Cache-Control "no-cache";
    try_files /index.html =404;
}

location @ownai_static_file {
    root /www/wwwroot/ownai;
    default_type text/plain;
    charset utf-8;
    try_files $uri =404;
}
```

说明：

- 在 `location` 内声明 `error_page` 会覆盖 server 级的 `error_page 404`，所以后端返回
  的 `404` 会原样透传，不会被替换成宝塔默认的 404 页。
- 后端停机或模板缺失时自动回退到静态 `index.html`、`sitemap.xml`、`llms.txt`，
  页面功能不受影响。
- 不要给这几个 location 加 `proxy_cache`，原因见第 1 节的缓存说明。

## 3. 验证

本地（后端使用 local profile，前台先 `npm run build`）：

```powershell
curl.exe -s "http://127.0.0.1:8011/api/seo/render?path=/tutorials" | Select-String "<title>|<h1>"
curl.exe -s -o NUL -w "%{http_code}" "http://127.0.0.1:8011/api/seo/render?path=/tutorials/posts/1"
curl.exe -s http://127.0.0.1:8011/api/seo/llms.txt
```

上线后：

```bash
UA='Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)'
curl -s -A "$UA" https://ownai.icu/tutorials | grep -o '<title>[^<]*</title>'
curl -s -A "$UA" https://ownai.icu/tutorials/posts/<public-id> | grep -c '<article>'
curl -sI https://ownai.icu/llms.txt | grep -i content-type        # text/plain
curl -s https://ownai.icu/sitemap.xml | grep -c '<loc>'
curl -s -o /dev/null -w '%{http_code}\n' https://ownai.icu/tutorials/posts/1   # 404
curl -s -A "$UA" https://ownai.icu/prompts/<free-id> | grep -c '<pre><code>'        # 1
curl -s -A "$UA" https://ownai.icu/prompts/<member-id> | grep -c '<pre><code>'      # 0
curl -s -o /dev/null -w '%{http_code}\n' https://ownai.icu/prompts/1             # 404
```

AI 爬虫访问统计：

```bash
grep -Eo 'GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-SearchBot|PerplexityBot|Bytespider|Google-Extended' \
  /www/wwwlogs/ownai.icu.log | sort | uniq -c
```

## 4. 未覆盖

- `/artwork/deconstruction/:id` 仍走 `ProtectedRoute`，深度解构内容不对爬虫公开。
- `/ownai-design`、`/video-backgrounds`、`/pricing`、`/legal/*` 目前只有壳里的首页
  meta，按需补充到 `SeoContentService`。
