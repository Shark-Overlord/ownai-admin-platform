# Codex 重置监控发布记录

- 发布时间：2026-09-27 14:06（Asia/Shanghai）
- 发布范围：后端、用户前台（未部署管理后台）
- `develop` 功能提交：`b30da3ab95300b01fdd2e5bf38d4885a581dff2b`
- `main` 发布提交：`c4c33fdad5557ab8f59859f8bb8251567d2461af`
- 发布名称：`20260927-140648-c4c33fd`
- 服务器备份目录：`/opt/springboot-init/releases/20260927-140648-c4c33fd`

## 构建与测试

- 后端：`mvnw.cmd -B package -DskipTests`，成功。
- 用户前台：`npm ci` 后执行 `npm run build`，成功；站点地图生成 33 个公开 URL。
- 完整测试：共运行 240 项，0 个断言失败、1 个环境错误、2 个跳过。唯一错误为手工 COS 上传测试缺少仓库根目录 `test.json`，与产品逻辑无关；`CodexResetMonitorParserTest` 2/2 通过。
- 本地匿名访问 `/api/codex-reset/overview` 返回 HTTP 200。
- 桌面端、390 px 移动端及明暗主题已在本地页面检查。

## 线上验证

- `springboot-init`：`active`
- `https://ownai.icu/codex-reset`：HTTP 200，`text/html`
- `https://ownai.icu/`：HTTP 200，`text/html`
- `https://ownai.icu/api/codex-reset/overview`：业务码 0，`available=true`
- 数据量：78 条历史、78 条动态、36 次已确认重置
- 最新信号：2026-09-27，全员重置（计划状态）

## 产物哈希

- 后端 JAR SHA-256：`da047e83b108ddbefca7a2b07a454a19dbead6ddfb936a64699f803f56d07865`
- 用户前台 `index.html` SHA-256：`400f39309c58548f2aa0b81eedf20756f63dad6b6228be58c2a950f3f4274606`
- 本地产物与服务器文件哈希一致。

## 回退命令

```powershell
ssh ownai "cp -p '/opt/springboot-init/releases/20260927-140648-c4c33fd/app.jar.before' '/opt/springboot-init/app.jar' && tar -xzf '/opt/springboot-init/releases/20260927-140648-c4c33fd/frontend.before.tar.gz' -C '/www/wwwroot/ownai' && find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type d -exec chmod 755 {} + 2>/dev/null; find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type f -exec chmod 644 {} + 2>/dev/null && sudo systemctl restart springboot-init"
```
