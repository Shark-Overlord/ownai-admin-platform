# 2026-09-13 前台视频自动播放与 COS 缓存发布记录

## 提交

- 功能开发提交：`a1d180b50a79a922890653de47916f2a40ad5019`
- 最终 develop 提交：`c6ad0a0a17e9166ac9edfb14eabe63c0c91fa22b`
- 最终 main 发布提交：`57388222077a1656e2422cec3c3c1d518fdfd939`

## 发布范围

- `/frontend-prompts` 共用 `PromptCard` 的可见区视频自动播放调度：最多随机 5 个，10 秒重新随机，离开可见区或页面隐藏时暂停。
- 视频使用 `preload="none"`，仅在被选中播放时请求数据；不支持或加载失败时保留封面回退。
- 后端 COS 视频上传统一写入 `Cache-Control: public, max-age=31536000, immutable` 与 `Content-Disposition: inline`。
- 发布流水线增加上线前备份、发布哈希和回滚信息，并对 JAR 上传增加断点续传与超时。

## 验证

- `CosManagerMetadataTest`：3 个测试通过，0 失败、0 错误。
- `web-admin npm run build`：通过。
- `web-frontend npm run build`：通过，目标分包为 `FrontendPromptLibraryPage-Y4Hhl5GS.js`。
- 本地浏览器验收：桌面浅色 12 个可见视频中播放 5 个且 10 秒轮换；桌面深色 8 个中播放 5 个；390 px 移动端明暗主题均为 2 个可见、2 个播放。
- 公网页面：`https://ownai.icu/`、`/frontend-prompts`、目标 JS 分包和 `https://admin.ownai.icu/` 均返回 HTTP 200。
- 后端健康：分类接口 HTTP 200 且业务码为 `0`；未登录接口 HTTP 200 且业务码为 `40100`；systemd 状态为 `active/running`。
- 匿名浏览器访问 `/frontend-prompts` 正常跳转 `/auth/login`，四种视口/主题均无页面脚本错误；登录后的核心交互使用本地模拟 API 完成验收。
- 腾讯云示例视频支持 Range 请求并返回长期缓存头，但该存量对象仍为 `Content-Disposition: attachment`、`x-cos-force-download: true`；新上传对象会由本次后端代码自动设置为 `inline`。

## 服务器记录

- 完整上线前备份：`/opt/springboot-init/releases/34764238378-6eab44df3791a97f939910003179ffb02f4d6719`
- 本次手动部署产物与证据：`/opt/springboot-init/releases/manual-20260913-2332-5738822`
- GitHub Actions `34764238378`：JAR rsync 卡住后人工取消，备份已成功。
- GitHub Actions `34765098902`：JAR 上传完成并重启后端，因多余的提权状态检查失败，前端尚未部署。
- GitHub Actions `34765271198`：发现本机生产密钥后人工取消，改用本机直连完成静态站部署。
- 取消任务留下的 `/opt/springboot-init/app.jar.tmp`（71,401,472 字节）已删除。
- 目录权限为 755，发布文件权限为 644。

## 上线哈希

```text
00e9011cdaed492f89610d0eb7ad862951695e14f036cea29761baa578604d58  /opt/springboot-init/app.jar
962d127f7caa0f715dfbccab6ee0b869fe690b0a157ae9410ca7d66bfdcde879  /www/wwwroot/springboot-init-admin/index.html
0bd2825800803ac185b01d60805a33d49a27dfe21a23cf05ee53d88831030f82  /www/wwwroot/ownai/index.html
45c594e10f8e6d676aa0a0ac8b8a3ae5b3038e4ae12277bd9f24bdbd9afbaf54  /www/wwwroot/ownai/assets/FrontendPromptLibraryPage-Y4Hhl5GS.js
```

## 回滚命令

在 PowerShell 中执行下面的命令会恢复本次发布前的后端、后台和前台，并重新设置静态文件权限：

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_rsa" -o IdentitiesOnly=yes root@101.200.91.81 'set -eu; backup=/opt/springboot-init/releases/34764238378-6eab44df3791a97f939910003179ffb02f4d6719; restore=$(mktemp -d /opt/springboot-init/releases/rollback-5738822-XXXXXX); mkdir -p "$restore/admin" "$restore/frontend"; tar -xzf "$backup/admin.before.tar.gz" -C "$restore/admin"; tar -xzf "$backup/frontend.before.tar.gz" -C "$restore/frontend"; rsync -r --delete --exclude=index.html --no-times --omit-dir-times --no-perms --no-owner --no-group "$restore/admin/" /www/wwwroot/springboot-init-admin/; install -m 644 "$restore/admin/index.html" /www/wwwroot/springboot-init-admin/index.html; rsync -r --delete --exclude=index.html --no-times --omit-dir-times --no-perms --no-owner --no-group "$restore/frontend/" /www/wwwroot/ownai/; install -m 644 "$restore/frontend/index.html" /www/wwwroot/ownai/index.html; cp -p "$backup/app.jar.before" /opt/springboot-init/app.jar; find /www/wwwroot/springboot-init-admin /www/wwwroot/ownai -type d -exec chmod 755 {} +; find /www/wwwroot/springboot-init-admin /www/wwwroot/ownai -type f -exec chmod 644 {} +; systemctl restart springboot-init; systemctl is-active springboot-init'
```
