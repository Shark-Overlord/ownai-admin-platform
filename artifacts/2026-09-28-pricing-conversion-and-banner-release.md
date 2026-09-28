# 2026-09-28 会员转化与全站顶栏特惠横幅发布记录

## 发布范围

- 用户前台：`web-frontend`
- 未改动后端代码及管理后台，未执行增量数据库变更。

## Git 版本

- 开发提交：`bf01916 feat: 优化会员定价文案、增加全站顶栏特惠横幅与快捷支付转化`
- 发布提交：`88d2396 release: 优化会员定价文案、增加全站顶栏特惠横幅与快捷支付转化 [skip ci]`
- `develop` 与 `main` 均已推送到远端 `origin`。

## 构建与部署

- 本地构建：`tsc && vite build && node scripts/generate-sitemap.mjs` 通过。
- 部署脚本：`powershell -File .\deploy.ps1 -Frontend`。
- 服务器备份目录：`/opt/springboot-init/releases/20260928-191621-bf01916`
- 目录与文件权限：目录为 `755`，文件为 `644`，属主为 `deploy:www`。

## 上线哈希

```text
dfb15d70bfb742e478014e382c5eef0dba61aa674dae0d5edee073e6a543a890  /www/wwwroot/ownai/index.html
```

## 公网验证

- `https://ownai.icu/`：HTTP 200 OK，Last-Modified 为 Mon, 28 Sep 2026 11:16:50 GMT。
- `https://ownai.icu/pricing`：已更新会员定价文案与“原价 ¥598”划线价。
- 全站顶栏：包含动态价格读取与 30 天倒计时胶囊，已按要求精简图标与文案。
- 提示词解锁弹窗：已上线 1 元快捷充值解锁支持。

## 回退命令

```powershell
ssh ownai "tar -xzf '/opt/springboot-init/releases/20260928-191621-bf01916/frontend.before.tar.gz' -C '/www/wwwroot/ownai' && find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type d -exec chmod 755 {} + 2>/dev/null; find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type f -exec chmod 644 {} + 2>/dev/null"
```
