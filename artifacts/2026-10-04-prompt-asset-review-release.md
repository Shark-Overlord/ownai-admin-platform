# 图像提示词键盘审核页发布记录

- 发布时间：2026-10-04 23:24（Asia/Shanghai）
- 发布模块：`web-admin`
- 开发提交：`1ea5911971e6d8cdc77d61fe1819dc92da87d361`
- 发布提交：`50c55094de9f290fba9ccf94ba23e0b83434af86`
- 服务器备份：`/opt/springboot-init/releases/20261004-232435-50c5509`
- 线上入口哈希：`8ca6986fe99ddac110b4a5921b2aba63b117e35ba679756f403d3e151022810b`
- 线上主资源：`/assets/index-Dc7M4oXD.js`

## 验证结果

- `web-admin` 本地生产构建通过。
- `https://admin.ownai.icu/` 返回 HTTP 200。
- `https://admin.ownai.icu/prompt-asset-review` 返回 HTTP 200。
- 线上主资源返回 HTTP 200，并包含 `prompt-asset-review` 与“图像提示词审核”。
- 本地和线上 `index.html` SHA-256 一致。
- 未登录 API 探针返回业务码 `40100`。
- `springboot-init.service` 保持 `active`。
- 线上后台目录权限为 755，入口和主资源文件权限为 644。

## 回退命令

```powershell
ssh ownai "set -e; tar -xzf '/opt/springboot-init/releases/20261004-232435-50c5509/admin.before.tar.gz' -C '/www/wwwroot/springboot-init-admin'; find '/www/wwwroot/springboot-init-admin' -type d -exec chmod 755 {} +; find '/www/wwwroot/springboot-init-admin' -type f -exec chmod 644 {} +; curl -fsSI 'https://admin.ownai.icu/' >/dev/null"
```
