---
name: ownai-design-skill
description: OwnAI 智能设计与前端解构技能 — 按多维设计语义检索 870+ 高质感网页/App 界面设计作品、单页 HTML 原型、细粒度 TSX 组件切片、Framer Motion 微动效参数与设计系统规范
version: 1.0.0
author: OwnAI
---

# OwnAI 设计解构 Skill

通过 OwnAI MCP 服务，按「业务场景、终端设备、视觉风格、构件类型、动效特征」5 大设计语义，为前端开发与 UI 生成任务检索可复用的界面作品、组件源码、微动效配置与设计系统 Tokens。

## 推荐标准工作流

1. **先选图再落地源码（两步法）**：当用户想做一个完整页面或模块但尚未指定具体参考作品时，先调用 `find_design_artworks` 推荐 5 个候选作品，**必须使用 Markdown 图片语法 `![作品名](coverUrl)` 渲染封面截图**供用户挑选；若用户说「换一批」，递增 `page` 并将已展示标题拼入 `excludeTitles`；用户选中某作品后，再调用 `get_artwork_code` 拉取完整单页 HTML 原型与 TSX 切片落地到工程。
2. **局部组件直查**：若用户只需某个局部构件（如「带弹簧动效的灵动岛状态栏」「毛玻璃底部 Tab 栏」），直接调用 `find_design_components`。
3. **动效与设计规范**：需要 Framer Motion / Tailwind / CSS 缓动参数时调用 `find_motion_presets`；需要整套色盘、字阶、圆角与 System Prompt 时调用 `get_design_system`。

## 可用工具

### 1. find_design_artworks — 推荐候选设计作品（第一步预览）

按场景、设备与风格推荐候选设计作品（返回标题、封面图 `coverUrl`、设计摘要与可用构件列表，不含大段源码）。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景，如：`电商`、`社交/聊天`、`SaaS仪表盘`、`官网`、`个人博客` |
| device | string | - | 终端载体：`app`（移动端）或 `website`（桌面网页） |
| style | string | - | 视觉风格，如：`极简`、`暗黑`、`玻璃拟态`、`渐变霓虹`、`粗野主义` |
| keyword | string | - | 自由搜索关键词 |
| page | number | - | 页码，默认 `1`；用户要求「换一批」时递增为 `2`、`3` |
| excludeTitles | string | - | 逗号分隔的已展示作品标题列表，避免重复推荐 |
| limit | number | - | 返回条数，默认 `5`，最大 `10` |

### 2. get_artwork_code — 拉取选中作品的完整前端源码（第二步落地）

获取指定作品的可独立运行单页原型（`prototypeHtml`）、细粒度 TSX 组件切片列表（`components`）及深度解构规范（`designSpec`）。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| artworkTitle | string | 是 | 用户选中的作品标题或核心关键词（如 `Claude iOS 聊天客户端`） |
| codeType | string | - | 代码偏好：`all`（默认全部）、`prototype`（单页原型）、`components`（组件切片） |

### 3. find_design_components — 多维语义检索 TSX/JSX 组件切片

优先匹配用户个人收藏资产，并结合平台已解构作品库按多维设计语义打分排序返回组件代码与关联动效。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景，如：`电商`、`社交/聊天`、`SaaS仪表盘` |
| device | string | - | 终端载体：`app` 或 `website` |
| style | string | - | 视觉风格，如：`极简`、`暗黑`、`毛玻璃` |
| componentType | string | - | 构件类型，如：`导航栏/Header`、`状态栏/灵动岛`、`对话气泡`、`卡片`、`底部Tab` |
| motionType | string | - | 动效特征，如：`spring`、`micro-interaction`、`stagger`、`transition` |
| keyword | string | - | 补充搜索关键词 |
| includeCode | boolean | - | 是否返回完整组件源码，默认 `true` |
| source | string | - | 数据范围：`all`（默认全库含收藏）或 `favorites`（仅查个人收藏） |
| limit | number | - | 返回上限，默认 `5`，最大 `15` |

### 4. get_design_system — 获取设计系统色盘与全局 Tokens

提取目标风格或作品的色彩色盘（`colorPalette`）、字体排版（`typography`）、间距圆角（`layout`）、动效参数（`motionTokens`）与完整 UI System Prompt。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景，如：`电商`、`社交`、`SaaS` |
| device | string | - | 终端载体：`app` 或 `website` |
| style | string | - | 视觉风格，如：`极简`、`暗黑`、`纸质质感` |
| keyword | string | - | 作品名称或特征关键词 |

### 5. find_motion_presets — 检索交互微动效与动画参数预设

返回开箱即用的 Framer Motion 配置片段、Tailwind 动画类名与 CSS `cubic-bezier` 曲线。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| motionIntent | string | 是 | 动效意图，如：`灵动岛弹性展开`、`按钮按压微交互`、`列表交错飞入` |
| techStack | string | - | 技术栈偏好：`framer-motion`、`tailwind-css`、`css-bezier` |
| device | string | - | 终端载体：`app` 或 `website` |

### 6. find_prompts_for_creation — 检索前端 UI 与视觉生图提示词模板

按视觉风格与用途检索高品质前端 UI 生成规范及 Midjourney / FLUX 视觉提示词，返回 `coverUrl` 效果图。

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| visualStyle | string | - | 视觉风格，如：`极简扁平`、`3D质感`、`深色科技` |
| scenario | string | - | 应用场景，如：`App界面`、`网页Hero`、`产品海报` |
| keyword | string | - | 自由搜索词 |
| targetTool | string | - | 目标工具：`frontend-ui`、`midjourney`、`flux`、`dall-e` |
| limit | number | - | 返回条数，默认 `5`，最大 `20` |

### 7. 个人收藏快捷工具

- `search_my_favorites(assetType?, keyword?, limit?)`：仅在当前用户收藏的组件/提示词资产中检索。
- `get_favorite_detail(keyword)`：按标题或关键词读取单条收藏资产的完整代码。

## 认证范围、过期与错误处理说明

- **授权范围**：本连接器使用用户在 `https://ownai.icu/mcp/auth?client=WorkBuddy` 生成的 `omk_` 开头专属密钥，仅拥有只读检索设计作品、源码切片与用户个人收藏的最小权限，不会修改用户账号或计费数据。
- **401 凭证失效或会员到期**：若接口返回 `401 Unauthorized`（密钥填写有误、已被吊销或 OwnAI 会员已到期），请提示用户前往 `https://ownai.icu/mcp/auth?client=WorkBuddy` 检查会员状态并重新生成密钥，在 WorkBuddy 连接器配置中更新后重连。
- **429 频率超限**：服务端设有防突发与日度配额保护（3 次/秒、30 次/分、800 次/天）。收到 `429` 时请按 `Retry-After` 稍候重试，避免循环高频并发调用。
