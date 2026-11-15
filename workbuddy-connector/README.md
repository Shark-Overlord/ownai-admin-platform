# OwnAI × WorkBuddy Connector 提交包

本目录已按 [WorkBuddy 开放平台 Connector 官方规范](https://open.workbuddy.cn/docs/connector) 准备好三套可直接提审或本地加载的 MCP + Skill 连接器包：

| 目录 | `source` 标识 | 认证方式 (`auth_mode`) | 适用场景与提审策略 |
| --- | --- | --- | --- |
| `ownai-design/` | `ownai-design` | `"token"`（用户自填凭证） | **主力首发版（立即可提审上架）**：无需等待云端 OAuth 预注册联调，WorkBuddy 弹出密钥表单并提供一键获取入口 `https://ownai.icu/mcp/auth?client=WorkBuddy`，会员填入 `omk_xxx` 即可解锁全部单页 HTML 原型、TSX 切片与个人收藏。 |
| `ownai-design-free/` | `ownai-design-free` | 省略（免登录体验） | **零门槛公域引流版（独立免登录端点 `/api/mcp/free/sse`）**：用户点击「连接」0 配置即用，仅挂载 4 个 100% 完整可用的公开工具（设计作品封面预览、完整设计系统色盘规范、Framer Motion 微动效参数与公开免费提示词），零截断占位符。 |
| `ownai-design-oauth/` | `ownai-design-oauth` | `"server-side"` (`oauth2_code`) | **云端托管 OAuth 2.0 升级版**：对接后端 `/api/mcp/oauth2/authorize` 与 `/api/mcp/oauth2/token`（支持 PKCE `S256`、90 天 `refresh_token` 自动续期及官方 5 条回调域名白名单），用户浏览器一键确认即可跨端同步授权。 |

---

## 云端托管 OAuth 2.0（`ownai-design-oauth`）启用步骤

1. 生成高熵随机密钥（例如 32 字节 Hex/Base64），写入生产服务器后端环境变量：
   ```bash
   OWNAI_MCP_OAUTH2_CLIENT_ID=ownai-workbuddy-client
   OWNAI_MCP_OAUTH2_CLIENT_SECRET=<你生成的随机密钥>
   ```
2. 在开放平台 [Connector Meta 工具](https://open.workbuddy.cn) 填写或导出提交包时，将 `ownai-design-oauth/connector-meta.json` 中的 `<REPLACE_WITH_OWNAI_MCP_OAUTH2_CLIENT_SECRET>` 替换为同一密钥（**切勿把真实密钥提交进公开 Git 仓库**）。
3. 后端已内置放行 WorkBuddy 官方要求的全部 5 条回调域名白名单（含多级子域名通配）：
   - `*.workbuddy.cn`
   - `*.codebuddy.cn`
   - `*.workbuddy.ai`
   - `copilot.tencent.com`
   - `staging-codebuddy.tencent.com`

---

## 提交前自查清单对照

- [x] `source` 全小写 kebab-case 且三个包互不冲突
- [x] `minWorkbuddyVersion` 统一声明为 `"4.24.0"`（覆盖 `name_zh`/`name_en`、`examples_zh`/`examples_en`、`token` 与 `server_auth`）
- [x] `mcp.json` 仅含单个 `mcpServers` 项：主力版/OAuth 版使用 `https://ownai.icu/api/sse`，免登录版使用独立 `https://ownai.icu/api/mcp/free/sse`（下发 `/api/mcp/free/message?sessionId=...`）
- [x] `icon.png` 为 64×64 透明背景高清 PNG
- [x] 仓库内所有 JSON / Skill 文件零硬编码真实密钥
