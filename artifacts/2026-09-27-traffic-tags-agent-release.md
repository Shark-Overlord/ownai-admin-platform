# 流量标签与 Agent 更新能力发布记录

- 发布时间：2026-09-27 16:41（Asia/Shanghai）
- 开发提交：`e43be9d95039e1cc5fe68527e76d2ae4b9a39cc7`
- 发布提交：`452d3c41f0678ea0e89d12ef750ac09149073eef`
- 发布模块：后端、管理后台、用户前台
- 服务器备份：`/opt/springboot-init/releases/20260927-164100-452d3c4`

## 数据库迁移

已执行 `sql/traffic_tag_schema_and_seed.sql`：

- `traffic_tag` 有效数据共 16 条；
- 抖音 13 条，小红书 3 条；
- 非 `douyin` / `xiaohongshu` 数据为 0；
- 回退应用代码时保留该兼容性增量表和业务数据，不执行破坏性删表。

## 构建与测试

- 后端 `mvn package -DskipTests`：通过；
- 管理后台 `npm run build`：通过，只有既有的大分块提示；
- 用户前台 `npm run build`：通过，生成 34 个公开 sitemap URL；
- Agent 密钥、统一内容 API 定向测试：18 个测试全部通过；
- 全量测试基线：240 个测试中 0 失败、1 个环境错误、2 个跳过；唯一错误为手工 COS 测试缺少根目录 `test.json`，与产品逻辑无关。

## 线上验证

- `springboot-init.service`：`active`；
- `GET https://ownai.icu/api/traffic-tags/public/overview`：业务码 0，返回 16 条；
- `https://ownai.icu/traffic-tags`：HTTP 200；
- `https://admin.ownai.icu/`：HTTP 200；
- 未登录后台接口与无密钥 capabilities：均返回业务码 `40100`；
- 已有受控密钥查询 capabilities：包含 `traffic_tag`，操作为 `read,add,update`；
- 线上管理后台入口包包含“Agent 自动更新”和 `traffic_tag:update`；
- 应用内浏览器自动化组件本次启动失败；生产入口、动态资源、接口及本地/线上哈希已完成替代验证。

## SHA-256

- 后端 JAR：`bf146f472e9da7bcbb5a08accff8b50c4ccaa4df858bf8352bcfbef838032bde`
- 管理后台 `index.html`：`e51b59d3d7438b4b30ddde7fa378b753c84a775582d3163a1f671645ab714e24`
- 用户前台 `index.html`：`60333b73a3ee6e19e4a7ab70d234280a0374397718e6f36760b6be7440f1f00e`

## 回退命令

```powershell
ssh ownai "set -e; cp -p '/opt/springboot-init/releases/20260927-164100-452d3c4/app.jar.before' '/opt/springboot-init/app.jar'; tar -xzf '/opt/springboot-init/releases/20260927-164100-452d3c4/admin.before.tar.gz' -C '/www/wwwroot/springboot-init-admin'; tar -xzf '/opt/springboot-init/releases/20260927-164100-452d3c4/frontend.before.tar.gz' -C '/www/wwwroot/ownai'; find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type d -exec chmod 755 {} +; find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type f -exec chmod 644 {} +; sudo systemctl restart springboot-init"
```
