---
name: ownai-design-free-skill
description: OwnAI 设计灵感库免登录技能 — 检索精选网页与 App 界面设计高清预览图、完整设计系统色盘与排版规范、Framer Motion 微动效参数预设及公开免费提示词模板
version: 1.0.1
author: OwnAI
---

# OwnAI 设计灵感库 Skill

本连接器开箱即用、无需配置任何账号凭证，为前端开发、UI/UX 设计与视觉创作提供 4 项完整可用的核心能力：**设计作品高清预览检索**、**全局设计系统 Tokens 提取**、**交互微动效参数预设**与**公开免费提示词检索**。

## 标准响应与交付规范

1. **视觉作品灵感预览（`find_design_artworks`）**
   - 当用户寻找界面参考、页面布局灵感或特定风格案例时调用。
   - **必须使用 Markdown 图片语法 `![作品标题](coverUrl)` 直接渲染每件作品的高清封面图**，并附带适用终端（`app` / `website`）、设计亮点摘要与包含的核心构件清单。
   - 当用户提出「换一批」「看其他的」时，将 `page` 参数递增（`2`、`3`…），并把已展示过的作品标题以逗号分隔传入 `excludeTitles`，确保不重复推荐。

2. **全局设计系统与色盘规范（`get_design_system`）**
   - 当用户需要配色方案、字体字阶、圆角间距规范或前端生成的 System Prompt 时调用。
   - 以清晰表格输出 `colorPalette`（HEX / RGBA 色值与语义角色）、`typography`、`layout`、`motionTokens`，并提供返回的完整 `systemPrompt` 供直接复用或驱动本地前端代码生成。

3. **微动效与物理曲线直取（`find_motion_presets`）**
   - 当用户询问弹簧展开、按钮触觉按压、列表交错入场、卡片悬停、模态框/底部抽屉阻尼或呼吸流光动画时调用。
   - 直接按代码块输出开箱即用的 `framerMotionSnippet`（React Framer Motion）、`tailwindSnippet`（Tailwind CSS）与 `cssBezier`（原生 CSS `cubic-bezier` 曲线）。

4. **公开免费提示词模板（`find_prompts_for_creation`）**
   - 当用户需要前端 UI 生成提示词或 Midjourney / FLUX 视觉提示词时调用。
   - 若返回结果含非空 `coverUrl`，使用 `![标题](coverUrl)` 展示效果图，并完整列出英文 `promptContent` 与中文 `promptCn`。

## 可用工具参数说明

### 1. find_design_artworks — 检索精选设计作品封面与构件概览

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景，如：`电商`、`社交/聊天`、`SaaS仪表盘`、`官网`、`音乐` |
| device | string | - | 终端载体：`app`（移动端）或 `website`（桌面网页） |
| style | string | - | 视觉风格，如：`极简`、`暗黑`、`玻璃拟态`、`渐变霓虹` |
| keyword | string | - | 自由搜索关键词 |
| page | number | - | 页码，默认 `1`；「换一批」时递增 |
| excludeTitles | string | - | 逗号分隔的已展示作品标题列表 |
| limit | number | - | 返回条数，默认 `5`，最大 `10` |

### 2. get_design_system — 获取色盘、字阶、圆角与完整设计系统规范

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景，如：`SaaS`、`社交`、`电商` |
| device | string | - | `app` 或 `website` |
| style | string | - | 视觉风格，如：`暗黑`、`极简`、`纸质质感` |
| keyword | string | - | 作品名称或设计特征关键词 |

### 3. find_motion_presets — 检索交互微动效与物理动画参数预设

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| motionIntent | string | 是 | 动效意图，如：`灵动岛弹簧展开`、`按钮按压微交互`、`列表交错飞入`、`卡片悬停浮起`、`底部抽屉弹出` |
| techStack | string | - | 技术栈偏好：`framer-motion`、`tailwind-css`、`css-bezier` |
| device | string | - | `app` 或 `website` |

### 4. find_prompts_for_creation — 检索公开免费 UI 与视觉提示词模板

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| visualStyle | string | - | 视觉风格，如：`极简科技`、`3D质感`、`深色扁平` |
| scenario | string | - | 应用场景，如：`网页Hero`、`App界面`、`产品海报` |
| keyword | string | - | 自由搜索词 |
| targetTool | string | - | `frontend-ui`、`midjourney`、`flux`、`dall-e` |
| limit | number | - | 返回条数，默认 `5`，最大 `20` |

## 服务配额与异常处理

- 免登录公开端点对实际工具调用设有合理防刷保护（15 次/秒、120 次/分、600 次/天；SSE 握手与能力发现不计入配额）。若收到 `429` 响应，请按 `Retry-After` 头稍候重试。
