---
name: ownai-design-skill
description: OwnAI 智能设计与前端解构技能 — 按多维设计语义检索 870+ 高质感网页/App 界面设计作品、单页 HTML 原型、细粒度 TSX 组件切片、Framer Motion 微动效参数与设计系统规范
version: 1.0.1
author: OwnAI
---

# OwnAI 设计解构 Skill（云端 OAuth 授权版）

通过 OwnAI MCP 服务，按「业务场景、终端设备、视觉风格、构件类型、动效特征」5 大设计语义，为前端开发与 UI 生成任务检索可复用的界面作品、组件源码、微动效配置与设计系统 Tokens。

## 推荐标准工作流

1. **先选图再落地源码（两步法）**：当用户想做一个完整页面或模块但尚未指定参考作品时，先调用 `find_design_artworks` 推荐 5 个候选作品，**必须使用 `![作品名](coverUrl)` 渲染封面截图**供用户挑选；若用户说「换一批」，递增 `page` 并将已展示标题传入 `excludeTitles`；用户选中后调用 `get_artwork_code` 拉取完整单页 HTML 原型与 TSX 切片。
2. **局部组件直查**：若用户只需某个局部构件（如「带弹簧动效的灵动岛状态栏」「毛玻璃底部 Tab 栏」），直接调用 `find_design_components`。
3. **动效与设计规范**：需要 Framer Motion / Tailwind / CSS 缓动参数时调用 `find_motion_presets`；需要整套色盘、字阶、圆角与 System Prompt 时调用 `get_design_system`。

## 可用工具

### 1. find_design_artworks — 推荐候选设计作品（第一步预览）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景，如：`电商`、`社交/聊天`、`SaaS仪表盘`、`官网` |
| device | string | - | 终端载体：`app` 或 `website` |
| style | string | - | 视觉风格，如：`极简`、`暗黑`、`玻璃拟态`、`渐变霓虹` |
| keyword | string | - | 自由搜索关键词 |
| page | number | - | 页码，默认 `1`；「换一批」时递增 |
| excludeTitles | string | - | 逗号分隔的已展示作品标题列表 |
| limit | number | - | 返回条数，默认 `5`，最大 `10` |

### 2. get_artwork_code — 拉取选中作品的完整前端源码（第二步落地）

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| artworkTitle | string | 是 | 用户选中的作品标题或核心关键词 |
| codeType | string | - | 代码偏好：`all`（默认全部）、`prototype`、`components` |

### 3. find_design_components — 多维语义检索 TSX/JSX 组件切片

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景 |
| device | string | - | `app` 或 `website` |
| style | string | - | 视觉风格 |
| componentType | string | - | 构件类型，如：`导航栏/Header`、`状态栏/灵动岛`、`对话气泡`、`卡片` |
| motionType | string | - | 动效特征：`spring`、`micro-interaction`、`stagger`、`transition` |
| keyword | string | - | 补充搜索关键词 |
| includeCode | boolean | - | 是否返回完整组件源码，默认 `true` |
| source | string | - | `all`（默认）或 `favorites`（仅查个人收藏） |
| limit | number | - | 返回上限，默认 `5`，最大 `15` |

### 4. get_design_system — 获取设计系统色盘与全局 Tokens

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景 |
| device | string | - | `app` 或 `website` |
| style | string | - | 视觉风格 |
| keyword | string | - | 作品名称或特征关键词 |

### 5. find_motion_presets — 检索交互微动效与动画参数预设

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| motionIntent | string | 是 | 动效意图，如：`灵动岛弹性展开`、`按钮按压微交互`、`列表交错飞入` |
| techStack | string | - | `framer-motion`、`tailwind-css`、`css-bezier` |
| device | string | - | `app` 或 `website` |

### 6. find_prompts_for_creation — 检索前端 UI 与视觉生图提示词模板

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| visualStyle | string | - | 视觉风格 |
| scenario | string | - | 应用场景 |
| keyword | string | - | 自由搜索词 |
| targetTool | string | - | `frontend-ui`、`midjourney`、`flux`、`dall-e` |
| limit | number | - | 返回条数，默认 `5`，最大 `20` |

### 7. 个人收藏快捷工具

- `search_my_favorites(assetType?, keyword?, limit?)`：仅检索当前用户收藏的组件与提示词资产。
- `get_favorite_detail(keyword)`：按标题或关键词读取单条收藏资产的完整代码。

## 认证范围、过期与错误处理说明

- **授权范围**：`mcp:design` 仅授予只读检索平台设计作品、源码切片与用户个人收藏的最小权限。
- **401 授权失效或会员到期**：Access Token 有效期 30 天，WorkBuddy 云端会通过 90 天 `refresh_token` 自动无感续期。若用户在 OwnAI 个人中心主动吊销设备或会员到期导致返回 `401 Unauthorized`，请提示用户检查 `https://ownai.icu/pricing` 会员有效期并在 WorkBuddy 中重新点击连接完成浏览器授权。
- **429 频率超限**：遇到 `429` 时请按 `Retry-After` 等待后重试（限额：3 次/秒、30 次/分、800 次/天）。
