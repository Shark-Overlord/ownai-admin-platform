# OwnAI 前后台开发与部署规范

更新日期：2026-09-06。本文件是当前仓库的开发、发布和回退基准；线上
路径与服务状态已在同日从服务器核验。

## 文档导航

`docs/` 只保留当前仍需维护的规范和功能说明：

| 文档 | 用途 |
| --- | --- |
| `OWNAI_DEVELOPMENT_AND_DEPLOYMENT.md` | 三端目录、分支、本地联调、生产部署和回退基准 |
| `OWNAI_BACKEND_API_REFERENCE.md` | 常用后端接口索引；具体 DTO 与权限仍以代码为准 |
| `COMMUNITY_BACKEND_ADMIN_GUIDE.md` | 社区帖子、评论、新闻、公告和弹窗的统一说明 |
| `BLOG_FRONTEND_API_GUIDE.md` | 教程书、文章、收藏和有效阅读接口 |
| `CONTENT_UPLOAD_BOUNDARY.md` | 外部密钥、文件上传和内容导入边界 |
| `POINT_RECHARGE.md` | 积分充值配置、订单、入账和验收 |
| `artwork-points-unlock.md` | 作品积分永久解锁和权限规则 |
| `ALIPAY_LOCAL_SANDBOX.md` | 支付宝本地沙箱及回调配置 |
| `SECURITY_ACCESS_EVIDENCE.md` | Nginx 访问证据、日志留存和事件处理 |

功能规划完成后应把仍有效的契约合并进对应功能指南，并删除任务提示词和
“未实施”方案。单次生产发布证据放在 `artifacts/`，不继续堆入 `docs/`。

## 1. 工程边界

| 模块 | 当前目录 | 技术与本地端口 | 线上地址 | 线上位置 |
| --- | --- | --- | --- | --- |
| 用户前台 | `web-frontend/` | React + Vite，`5187` | `https://ownai.icu` | `/www/wwwroot/ownai` |
| 业务后端 | 仓库根目录、`src/` | Spring Boot，`8011` | 两个站点的 `/api` | `/opt/springboot-init/app.jar` |
| 管理后台 | `web-admin/` | React + Vite，`5173` | `https://admin.ownai.icu` | `/www/wwwroot/springboot-init-admin` |

三个模块的唯一开发仓库是：

```text
https://github.com/Shark-Overlord/ownai-admin-platform.git
```

用户前台由原独立仓库的 `develop@cf05dfc` 导入。迁移记录见
`web-frontend/MIGRATION.md`。迁移完成后，当前仓库是新功能的代码源，
不要在旧仓库并行修改同一功能。

## 2. 分支职责

- `develop`：日常开发和本地联调。所有新修改先进入这里。
- `codex/*` 或其他功能分支：需要隔离多人工作时，从 `develop` 创建，完成
  后合并回 `develop`。
- `main`：生产发布分支。只有用户明确要求上线时才合并和推送。
- 紧急修复从 `main` 创建，发布后必须同步回 `develop`，避免下次发布回退。

每次开始前执行：

```powershell
git status --short --branch
git fetch --prune origin
git checkout develop
git pull --ff-only origin develop
```

工作区有无关修改时，只暂存本次文件，不使用无范围的 `git add .`。提交前
至少执行 `git diff --check` 并检查 `git diff --cached --stat`。

## 3. 本地开发流程

准备 Node.js 22、JDK 17 和本地 MySQL。Java 构建目标仍为 Java 8；本地
脚本使用 JDK 17 运行 Maven。私密配置只放在：

```text
config/application-local-secrets.yml
config/application-ai-secrets.yml
```

启动顺序：

1. 后端：在仓库根目录执行 `.\start-backend.ps1`。
2. 管理后台：执行 `.\start-frontend.ps1`，访问 `http://127.0.0.1:5173`。
3. 用户前台：执行 `.\start-public-frontend.ps1`，访问
   `http://127.0.0.1:5187`。

首次启动两个前端前分别执行：

```powershell
Set-Location web-admin
npm ci
Set-Location ..\web-frontend
npm ci
Set-Location ..
```

两个 Vite 项目都将 `/api` 代理到 `http://127.0.0.1:8011`。用户前台如需
临时联调其他后端，可设置 `VITE_DEV_API_PROXY_TARGET`，但不得把个人环境
地址写入源码。

接口变更按以下顺序完成：

1. 先确定后端请求、响应和权限规则。
2. 实现后端与必要的增量 SQL；禁止重置线上数据库。
3. 同步修改 `web-admin/` 的运营入口和 `web-frontend/` 的用户交互。
4. 使用真实本地接口联调登录态、异常态和权限边界。
5. 分别构建受影响模块，提交到 `develop`，不自动上线。

## 4. 本地验收门槛

根据改动范围执行：

```powershell
.\mvnw.cmd test

Set-Location web-admin
npm run build

Set-Location ..\web-frontend
npm run build
```

其中 `CosManagerTest` 是连接真实腾讯 COS 的手工集成测试，需要仓库根目录的
`test.json` 和有效的本地 COS 凭据。缺少测试文件时会产生一个环境错误，
应与业务单元测试失败分开记录；发布构建仍以
`.\\mvnw.cmd -B package -DskipTests` 验证可打包性。

用户前台界面还需检查桌面端、390px 手机端、深色和浅色主题。涉及支付、
积分、会员或订单时，应验证重复请求、未登录、余额不足、支付失败、支付
回调和订单记录；本地模拟支付不能替代一笔真实小额支付验收。

## 5. 发布流程

生产服务器：

```text
101.200.91.81
```

发布前必须完成本地验收，并确认 `develop` 已推送。使用独立 worktree 或
干净检出合并发布，避免把日常工作区的未提交文件带入 `main`：

```powershell
git fetch --prune origin
git checkout main
git pull --ff-only origin main
git merge --no-ff origin/develop -m "release: describe the release"
git push origin main
```

推送 `main` 后，`.github/workflows/deploy.yml` 会：

1. 构建后端 JAR。
2. 构建 `web-admin/dist`。
3. 构建 `web-frontend/dist`。
4. 上传 JAR 并重启 `springboot-init.service`。
5. 先同步新静态资源，再原子替换各自的 `index.html`，最后清理旧资源。

自动部署使用 `rsync --no-perms --no-owner --no-group`。从 Windows 生成的
`dist` 不得使用裸 `rsync -a` 同步，否则 Windows 权限位可能使 Nginx
失去目录读取权限。

## 6. 服务器基准

| 项目 | 当前值 |
| --- | --- |
| SSH 主机 | `101.200.91.81` |
| 日常部署用户 | `deploy` |
| 紧急维护用户 | `root` |
| 后端服务 | `springboot-init.service`，监听 `127.0.0.1:8011` |
| 后端环境文件 | `/etc/springboot-init/springboot-init.env` |
| 前台 Nginx 配置 | `/www/server/panel/vhost/nginx/ownai-docs.conf` |
| 后台 Nginx 配置 | `/www/server/panel/vhost/nginx/springboot-init-admin.conf` |
| 开发预览配置 | `/www/server/panel/vhost/nginx/de-ownai.conf` |
| 发布备份目录 | `/opt/springboot-init/releases/<release-name>` |

任何 Nginx 修改都必须先执行：

```bash
nginx -t
```

静态目录使用目录 `755`、文件 `644`，并保证 Nginx 用户可以逐级读取。

## 7. 发布验证

发布完成后至少验证：

```bash
systemctl is-active springboot-init
curl -fsS http://127.0.0.1:8011/api/community/taxonomy/category
curl -I https://ownai.icu/
curl -I https://admin.ownai.icu/
curl https://admin.ownai.icu/api/user/get/login
```

最后一个未登录接口预期返回业务码 `40100`，这说明 Nginx 到后端的代理
正常。还要比较本地与线上 `index.html` 或关键资源的 SHA-256，并在真实
浏览器中走一遍本次改动的核心路径。

## 8. 备份与回退

正式发布前在服务器创建独立发布目录，并备份本次涉及的内容：

```bash
release=/opt/springboot-init/releases/<release-name>
mkdir -p "$release"
cp -p /opt/springboot-init/app.jar "$release/app.jar.before"
tar -czf "$release/admin.before.tar.gz" -C /www/wwwroot/springboot-init-admin .
tar -czf "$release/frontend.before.tar.gz" -C /www/wwwroot/ownai .
```

回退时只恢复受影响模块。恢复静态站后重新设定目录 `755`、文件 `644`；
恢复 JAR 后重启 `springboot-init` 并检查 `8011`。数据库迁移默认采用可兼容
的增量方式；回退代码时保留业务数据，禁止直接删除新订单、积分或用户记录。

每次发布记录应包含：`develop` 提交、`main` 发布提交、构建结果、服务器
备份目录、线上资源哈希、验证结果和一条可执行的回退命令。
