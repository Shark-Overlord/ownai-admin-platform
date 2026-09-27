# Codex 重置页交互优化发布记录

- 发布时间：2026-09-27 14:48（Asia/Shanghai）
- 发布范围：用户前台（未部署后端和管理后台）
- `develop` 功能提交：`f6d654a757feb944efd2ceddc463818c26d1c51f`
- `main` 发布提交：`4ee73fcb55288fe57875169cece1e3c058ece485`
- 发布名称：`20260927-144828-4ee73fc`
- 服务器备份目录：`/opt/springboot-init/releases/20260927-144828-4ee73fc`

## 发布内容

- 浏览器提醒开启前说明页面必须保持打开，用户确认后才申请通知权限。
- Codex 重置公告默认显示最新 8 条，点击“显示更多”后展开全部动态。
- 同步发布当前页面已有的左右广告位和客服咨询弹窗修改。

## 构建与验证

- 用户前台：`npm run build`，成功；站点地图生成 33 个公开 URL。
- TypeScript：`tsc --noEmit`，成功。
- 本地浏览器：提醒说明弹窗可正常打开和关闭；公告默认显示 8 条，“显示更多”显示剩余 70 条，点击后展开全部 78 条。
- `https://ownai.icu/codex-reset`：HTTP 200，`text/html`。
- 用户前台 `index.html` SHA-256：`d16ce5ef005f6147502df64fc562cdd45feac43850757415affe421cf57d7af5`。
- 本地产物与服务器文件哈希一致。

## 回退命令

```powershell
ssh ownai "tar -xzf '/opt/springboot-init/releases/20260927-144828-4ee73fc/frontend.before.tar.gz' -C '/www/wwwroot/ownai' && find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type d -exec chmod 755 {} + 2>/dev/null; find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type f -exec chmod 644 {} + 2>/dev/null"
```
