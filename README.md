# OWNAI Admin Platform

OWNAI Admin Platform 是一个面向 OWNAI 业务的后台管理系统，包含 Spring Boot 后端服务和 React 管理端前端。项目用于管理用户、作品、分类、标签、订单、会员、积分和操作日志，并已接入 GitHub Actions 自动部署到服务器。

## 功能概览

- 用户管理：账号注册、登录、JWT 鉴权、管理员用户维护、会员等级和积分信息管理。
- 作品管理：作品增删改查、作品上下架、价格和积分配置、HTML 作品包上传、在线预览。
- 分类与标签：分类管理、标签管理、分类标签绑定和树形关系维护。
- 订单管理：作品订单创建、支付回调、模拟支付、取消订单、订单分页查询。
- 会员系统：会员价格配置、会员订单、管理员手动授权会员。
- 积分中心：积分概览、每日签到、积分流水。
- 操作日志：通过 AOP 记录关键后台操作。
- 微信能力：预留微信公众号和微信开放平台登录配置。
- 文件存储：通过腾讯云 COS 上传和访问作品资源。

## 技术栈

后端：

- Java 8
- Spring Boot 2.7.2
- Spring MVC
- MyBatis Plus 3.5.2
- MySQL
- Redis 和 Spring Session Redis，按需启用
- Elasticsearch，按需启用
- Knife4j 接口文档
- JWT
- 腾讯云 COS SDK
- 微信公众号 SDK

前端：

- React 19
- TypeScript
- Vite
- Ant Design 5
- Ant Design Pro Components
- Axios
- React Router

部署：

- GitHub Actions
- Maven Wrapper
- Node.js 22
- systemd
- Nginx
- rsync + SSH

## 目录结构

```text
.
├── src/main/java/com/yupi/springbootinit
│   ├── controller        # 后端接口
│   ├── service           # 业务逻辑
│   ├── mapper            # MyBatis Plus Mapper
│   ├── model             # DTO、Entity、VO、Enum
│   ├── annotation        # 权限和操作日志注解
│   ├── aop               # 鉴权、日志、操作记录切面
│   ├── config            # CORS、MyBatis、COS、微信等配置
│   └── manager           # 第三方服务封装
├── src/main/resources
│   ├── application.yml
│   ├── application-local.yml
│   ├── application-prod.yml
│   └── mapper
├── web-admin             # React 管理端
├── deploy                # systemd 和环境变量模板
├── .github/workflows     # 自动部署工作流
└── DEPLOYMENT.md         # 服务器部署说明
```

## 本地开发

### 环境要求

- JDK 8
- Maven Wrapper，仓库已包含 `mvnw` 和 `mvnw.cmd`
- Node.js 22，或兼容当前 Vite/React 依赖的较新版本
- MySQL，数据库名默认 `my_db`
- Redis、Elasticsearch、COS、微信配置按业务需要启用

### 后端启动

先准备数据库并导入你的 SQL。SQL 文件不提交到本仓库。

PowerShell 示例：

```powershell
cd E:\JAVA_project\ownai-admin-platform

$env:SPRING_PROFILES_ACTIVE = "local"
$env:DB_URL = "jdbc:mysql://localhost:3306/my_db?useUnicode=true&characterEncoding=utf-8&useSSL=false&serverTimezone=Asia/Shanghai"
$env:DB_USERNAME = "root"
$env:DB_PASSWORD = "<your-local-db-password>"

.\mvnw.cmd spring-boot:run
```

后端默认监听：

- 服务端口：`8011`
- API 前缀：`/api`
- 本地接口地址：`http://localhost:8011/api`
- 本地接口文档：`http://localhost:8011/api/doc.html`

### 前端启动

```powershell
cd E:\JAVA_project\ownai-admin-platform\web-admin
npm install
$env:VITE_API_BASE_URL = "http://localhost:8011/api"
npm run dev
```

Vite 默认访问地址：

```text
http://localhost:5173
```

## 常用命令

后端构建：

```powershell
.\mvnw.cmd -DskipTests package
```

前端构建：

```powershell
cd web-admin
npm ci
npm run build
```

前端代码检查：

```powershell
cd web-admin
npm run lint
```

## 环境变量

生产环境不把密钥写入代码。服务器运行时配置放在：

```text
/etc/springboot-init/springboot-init.env
```

模板文件：

```text
deploy/springboot-init.env.example
```

关键配置：

| 变量 | 说明 |
| --- | --- |
| `SERVER_PORT` | 后端服务端口，默认 `8011` |
| `SPRING_PROFILES_ACTIVE` | 运行环境，生产环境使用 `prod` |
| `DB_URL` | MySQL JDBC 地址 |
| `DB_USERNAME` | MySQL 用户名 |
| `DB_PASSWORD` | MySQL 密码 |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Redis 配置 |
| `ES_URIS` / `ES_USERNAME` / `ES_PASSWORD` | Elasticsearch 配置 |
| `COS_HOST` / `COS_SECRET_ID` / `COS_SECRET_KEY` / `COS_REGION` / `COS_BUCKET` | 腾讯云 COS 配置 |
| `WX_MP_*` / `WX_OPEN_*` | 微信公众号和微信开放平台配置 |
| `KNIFE4J_ENABLE` | 是否启用接口文档 |

## 自动部署

仓库已经配置 GitHub Actions：

```text
.github/workflows/deploy.yml
```

推送到 `main` 分支后，工作流会自动执行：

1. 拉取代码。
2. 使用 Java 8 构建后端 jar。
3. 使用 Node.js 22 构建 `web-admin`。
4. 通过 SSH + rsync 上传后端 jar 到 `/opt/springboot-init/app.jar`。
5. 重启 `springboot-init.service`。
6. 上传前端静态文件到 `/www/wwwroot/springboot-init-admin`。

服务器当前路径：

| 项目 | 路径 |
| --- | --- |
| 后端 jar | `/opt/springboot-init/app.jar` |
| 后端环境变量 | `/etc/springboot-init/springboot-init.env` |
| 前端静态目录 | `/www/wwwroot/springboot-init-admin` |
| systemd 服务 | `springboot-init.service` |
| Nginx 配置 | `/www/server/panel/vhost/nginx/springboot-init-admin.conf` |
| 对外端口 | `8080` |
| 后端内网端口 | `8011` |

GitHub 仓库需要配置 Secret：

| Secret | 说明 |
| --- | --- |
| `DEPLOY_SSH_KEY` | 部署用户 SSH 私钥内容 |

## 开发和发布流程

建议始终在干净仓库目录开发：

```powershell
cd E:\JAVA_project\ownai-admin-platform
git pull
```

修改完成后：

```powershell
git status
git add .
git commit -m "描述本次修改"
git push origin main
```

推送成功后，GitHub Actions 会自动部署。

## 注意事项

- 不要提交数据库 SQL dump、真实密钥、服务器配置文件或 `.env` 文件。
- 生产环境配置只放在服务器 `/etc/springboot-init/springboot-init.env`。
- 如果公网无法访问 `http://101.200.91.81:8080`，先检查云服务器安全组是否放行 `8080/tcp`。
- 正式对外使用建议绑定域名并切换到 `80/443 + HTTPS`。
