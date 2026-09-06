# OwnAI 首页内容接口实现提示词

将下面“后端开发提示词”整段复制给后端开发会话即可。前台已经完成接入，后端接口上线后不需要再次修改前台代码。

## 当前前台接入约定

- 请求：`GET /api/home/content`
- 登录：不需要登录
- 响应：项目现有 `BaseResponse<HomeContentVO>`
- 前台行为：接口成功时使用后端内容；接口未上线或请求失败时静默使用当前首页内置内容。首屏作品墙只读取静态封面，不会读取或请求视频。
- ID：统一使用字符串，不能转换成 JavaScript `number`。
- 静态封面仅允许 WebP、JPEG 或 PNG；不要返回 GIF、MP4、WebM 等动态媒体作为封面。
- OwnAI Design 演示区是唯一的视频例外，前台直接挂载一个原生视频播放器。
- 品牌 Logo 等站点壳层本地素材不属于本接口。

## 后端开发提示词

```text
请在当前 Spring Boot 后端项目中实现 OwnAI 前台首页内容接口。先检查项目现有的 Controller、Service、VO、BaseResponse、异常处理、数据库规范和缓存方式，保持现有代码风格，不要新建重复的响应体系。

一、公开接口

GET /api/home/content

要求：
1. 不需要登录，游客可访问。
2. 返回项目现有 BaseResponse<HomeContentVO>。
3. 成功响应 code=0、message=ok。
4. 接口只返回已启用的首页内容。
5. 视频和课程按 sort 升序返回；sort 相同时按 id 升序，保证顺序稳定。
6. 所有数据库 BIGINT ID 在 JSON 中必须序列化为 string，不能返回 JavaScript 不安全的数字。
7. 素材 URL 必须是可公开访问的 HTTPS URL。
8. targetPath、ctaPath 返回前台 HashRouter 内部路径，例如 /tutorials、/ownai-design，不要包含域名和 #。
9. 这是公共内容接口，不返回 userId、会员状态或其他用户数据。
10. Controller 不要直接堆硬编码；请放入可维护的配置/数据层，并在 Service 中组装 VO。若当前尚未建设首页内容表，可以先使用项目现有配置机制保存初始内容，但要保持后续可替换为数据库配置。

二、响应类型

interface HomeContentVO {
  hero: HomeHeroContent;
  design: HomeDesignContent;
  course: HomeCourseContent;
  updateTime?: string;
}

interface HomeHeroContent {
  eyebrow: string;
  title: string;
  description: string;
  videoList: HomeVideoItem[];
}

interface HomeVideoItem {
  id: string;
  posterUrl: string;
  videoUrl?: string;
  alt: string;
  sort: number;
}

interface HomeDesignContent {
  title: string;
  description: string;
  ctaText: string;
  ctaPath: string;
  demoVideoUrl: string;
  demoVideoPosterUrl?: string;
}

interface HomeCourseContent {
  eyebrow: string;
  title: string;
  description: string;
  ctaText: string;
  ctaPath: string;
  footerTitle: string;
  footerDescription: string;
  itemList: HomeCourseItem[];
}

interface HomeCourseItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  coverAlt: string;
  statusText: string;
  targetPath: string;
  sort: number;
}

三、完整成功响应示例与初始内容

{
  "code": 0,
  "data": {
    "hero": {
      "eyebrow": "制作 · 收集 · 整理",
      "title": "500+ 精美前端提示词与源码",
      "description": "覆盖页面、组件与交互场景，为界面复刻与产品开发提供可直接使用的创作起点",
      "videoList": [
        {
          "id": "hero-cover-1",
          "posterUrl": "https://cdn.example.com/home/hero-cover-1.webp",
          "alt": "前端界面演示 1",
          "sort": 1
        },
        {
          "id": "hero-cover-2",
          "posterUrl": "https://cdn.example.com/home/hero-cover-2.webp",
          "alt": "前端界面演示 2",
          "sort": 2
        }
      ]
    },
    "design": {
      "title": "一键复制，任意网站UI设计",
      "description": "从完整页面到单个交互组件，通过真实演示了解 OwnAI Design 拆解为可复刻结构并还原细节的前端提示词。",
      "ctaText": "了解 OwnAI Design",
      "ctaPath": "/ownai-design",
      "demoVideoUrl": "https://cdn.example.com/home/ownai-design-demo.mp4",
      "demoVideoPosterUrl": "https://cdn.example.com/home/ownai-design-demo.webp"
    },
    "course": {
      "eyebrow": "SYSTEM COURSES",
      "title": "从想法到应用，建立完整开发能力",
      "description": "系统将持续开设面向真实项目的开发课程，帮助你理解方法、完成实践，并逐步构建自己的应用。",
      "ctaText": "查看现有教程",
      "ctaPath": "/tutorials",
      "footerTitle": "课程将围绕真实项目持续更新",
      "footerDescription": "学习路径、源码示例与实践过程会逐步补全",
      "itemList": [
        {
          "id": "frontend-course",
          "title": "前端开发",
          "description": "掌握现代界面工程、组件设计、交互实现与工程化实践",
          "coverUrl": "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/blog_image/1/PFcczSHL-frontend.png",
          "coverAlt": "前端开发课程封面",
          "statusText": "已上线",
          "targetPath": "/tutorials",
          "sort": 1
        },
        {
          "id": "agent-course",
          "title": "Agent 开发",
          "description": "学习工具调用、上下文管理与智能体应用的落地方法",
          "coverUrl": "https://bead-master-1316504135.cos.ap-guangzhou.myqcloud.com/blog_image/1/yFhRmHx0-agent.png",
          "coverAlt": "Agent 开发课程封面",
          "statusText": "已上线",
          "targetPath": "/tutorials",
          "sort": 2
        }
      ]
    },
    "updateTime": "2026-08-24T12:00:00"
  },
  "message": "ok"
}

四、实现与验收

1. 为上述结构建立 Java VO；所有 id 字段使用 String。
2. Service 只组装已启用内容，并执行稳定排序。
3. 校验 `hero.videoList[].posterUrl` 必填，并且只能返回 WebP、JPEG 或 PNG 静态图片。
4. `hero.videoList[].videoUrl` 可以保留用于兼容，但前台首页不会读取；不要依赖它实现首页展示。
5. 至少编写 Controller/Service 测试，覆盖成功、静态封面缺失、动态封面被拒绝、空配置和排序。
6. 请求 GET /api/home/content，确认 HTTP 200 且 BaseResponse code=0。
7. 确认首屏静态封面、1 个演示视频及其静态封面、课程封面均原样返回。
8. 确认接口可匿名访问，且不因未携带 JWT 返回 401。
9. 不要修改现有作品、教程、视频素材或用户接口。
```

## 前台字段与页面区域对应关系

| 返回字段 | 首页用途 |
|---|---|
| `hero.eyebrow/title/description` | 首屏蒙版中的三段文字 |
| `hero.videoList[].posterUrl` | 首屏倾斜循环移动的静态作品墙 |
| `hero.videoList[].videoUrl` | 兼容字段，首页不读取、不请求 |
| `design.demoVideoPosterUrl` | 可选兼容字段，当前演示区不读取 |
| `design.demoVideoUrl` | OwnAI Design 演示区直接使用的视频 |
| `course.*` | 课程区标题、说明、按钮和底部说明 |
| `course.itemList` | 已上线课程卡片与封面 |
