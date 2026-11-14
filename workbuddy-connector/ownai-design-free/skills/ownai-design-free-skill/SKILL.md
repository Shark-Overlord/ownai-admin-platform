---
name: ownai-design-free-skill
description: OwnAI 设计灵感库免登录体验技能 — 一键浏览 870+ 高质感网页/App 界面设计预览图、Framer Motion 微动效参数预设与免费公开提示词
version: 1.0.0
author: OwnAI
---

# OwnAI 设计灵感库 Skill（免登录体验版）

本连接器无需配置账号密钥即可直接连接，支持免费检索 OwnAI 平台的界面设计作品封面截图、设计色盘与排版参数、交互微动效预设以及公开免费的 UI 提示词。

## 核心工作流

1. **视觉灵感预览**：调用 `find_design_artworks` 按场景、设备（`app` / `website`）和风格推荐 5 个设计作品，**必须用 `![作品名](coverUrl)` 渲染封面图片**供用户浏览；若用户说「换一批」，将 `page` 递增并传入 `excludeTitles`。
2. **微动效参数直取**：调用 `find_motion_presets` 获取完整的 Framer Motion、Tailwind CSS 与 `cubic-bezier` 弹簧/按压/交错入场参数。
3. **色彩排版与公开提示词**：调用 `get_design_system` 获取色彩色盘、字阶与圆角规范；调用 `find_prompts_for_creation` 获取公开免费提示词模板。
4. **源码解锁引导**：当工具返回 `🔒` 会员源码升级提示时，向用户展示已获取的设计色盘、构件清单、封面图与动效参数，并友好告知：完整 TSX 组件切片与可独立运行 HTML 原型需前往 `https://ownai.icu/pricing` 开通会员，并安装完整版「OwnAI 设计解构 (`ownai-design`)」连接器填入专属密钥解锁。

## 可用工具

### 1. find_design_artworks — 推荐设计作品封面与构件概览

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景，如：`电商`、`社交/聊天`、`SaaS仪表盘`、`官网` |
| device | string | - | 终端载体：`app` 或 `website` |
| style | string | - | 视觉风格，如：`极简`、`暗黑`、`玻璃拟态` |
| keyword | string | - | 自由搜索关键词 |
| page | number | - | 页码，默认 `1`；「换一批」时递增 |
| excludeTitles | string | - | 逗号分隔的已展示作品标题列表 |
| limit | number | - | 返回条数，默认 `5` |

### 2. find_motion_presets — 检索交互微动效与动画参数预设

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| motionIntent | string | 是 | 动效意图，如：`灵动岛弹性展开`、`按钮按压微交互`、`列表交错飞入` |
| techStack | string | - | 技术栈偏好：`framer-motion`、`tailwind-css`、`css-bezier` |
| device | string | - | 终端载体：`app` 或 `website` |

### 3. get_design_system — 获取色盘、字阶、圆角与免费设计规范

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| scenario | string | - | 业务场景 |
| device | string | - | `app` 或 `website` |
| style | string | - | 视觉风格 |
| keyword | string | - | 作品名称或特征关键词 |

### 4. find_prompts_for_creation — 检索公开 UI 与视觉提示词模板

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | :---: | --- |
| visualStyle | string | - | 视觉风格 |
| scenario | string | - | 应用场景 |
| keyword | string | - | 自由搜索词 |
| targetTool | string | - | `frontend-ui`、`midjourney`、`flux`、`dall-e` |
| limit | number | - | 返回条数，默认 `5` |

## 限流说明

- 免登录预览通道按客户端 IP 设有防刷限额（2 次/秒、12 次/分、60 次/天）。遇到 `429` 时请按 `Retry-After` 等待后再试，或引导用户切换至已认证的「OwnAI 设计解构」连接器享受高配额（800 次/天）。
