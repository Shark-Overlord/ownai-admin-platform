# 前台教程接口使用说明

更新时间：2026-08-18

本文面向前台 Web 开发，说明如何接入教程书、教程目录、独立文章、会员阅读权限和用户收藏。

## 1. 接口约定

### 1.1 基础地址

| 环境 | 基础地址 |
|---|---|
| 本地 | `http://127.0.0.1:8011/api` |
| 生产 | 使用前端环境变量配置，例如 `VITE_API_BASE_URL=https://example.com/api` |

下文接口路径均基于 `/api`，例如：

```text
GET http://127.0.0.1:8011/api/blog/front/overview
```

### 1.2 通用响应

所有接口统一返回：

```ts
interface BaseResponse<T> {
  code: number;
  data: T | null;
  message: string;
}
```

成功示例：

```json
{
  "code": 0,
  "data": {},
  "message": "ok"
}
```

当前后端的业务异常通常仍返回 HTTP 200，因此前端不能只判断 `response.ok`，还必须判断响应体的 `code === 0`。

### 1.3 ID 与时间

- 后端所有 Java `Long` 字段都会序列化成 JSON 字符串，例如 `"2089574991362678786"`。
- 前端应把 `id`、`bookId`、`chapterId`、`categoryId`、`tagId` 定义为 `string`，不要转换成 JavaScript `number`，否则可能丢失精度。
- 请求中的 ID 推荐也传字符串；路径参数直接使用接口返回的 ID 字符串。
- 时间字段为后端 JSON 日期字符串，前端展示时再转换成本地时间。

### 1.4 登录凭证

教程浏览接口允许匿名调用；收藏、取消收藏、检查收藏状态和“我的收藏”接口必须登录。用户登录后应带上 JWT，以便后端识别登录可见文章、会员状态和收藏状态：

```http
Authorization: Bearer <token>
```

若不发送 Token，或 Token 无效、过期，前台教程接口会把请求视为匿名访问。

### 1.5 分页结构

分页请求默认 `current=1`、`pageSize=10`，前台接口限制每页最多 20 条。

```ts
interface PageResult<T> {
  records: T[];
  total: string;
  current: string;
  size: string;
  pages: string;
}
```

分页结构中的 Long 字段同样会返回字符串。

## 2. 推荐页面调用流程

```text
教程首页
  ├─ overview：加载统计数字
  ├─ filters：加载分类、标签筛选项
  └─ books/page：加载教程书卡片
       └─ 点击教程书 → books/{bookId}：加载章节目录
            └─ 点击文章
                 ├─ canAccess=true  → posts/{postId}：获取正文
                 └─ canAccess=false → 显示会员提示，再由正文接口做最终鉴权

独立文章页
  └─ posts/page：默认只查询不属于教程书的文章
       └─ 点击文章 → posts/{postId}：获取正文
```

目录中的 `canAccess` 仅用于提前展示锁定状态。文章是否最终可读，必须以文章详情接口的返回结果为准。

## 3. 接口说明

### 3.1 教程概览

```http
GET /blog/front/overview
```

无需请求参数。

响应数据：

```ts
interface BlogFrontOverview {
  bookCount: string;
  publishedPostCount: string;
  freeBookCount: string;
  memberBookCount: string;
}
```

教程书访问类型定义：

| accessType | 含义 |
|---|---|
| `free` | 免费教程；书内仍可以有单独设置为会员专享的文章 |
| `member` | 会员专享教程；整本书内的文章都要求有效会员 |

教程书权限由后台直接设置，不根据书内文章的权限推导。统计结果只包含当前访问者可见、已启用且至少有一篇已发布文章的教程书。

### 3.2 分类与标签筛选项

```http
GET /blog/front/filters
```

响应示例：

```json
{
  "code": 0,
  "data": {
    "categories": [
      {
        "id": "2089000000000000001",
        "name": "编程入门",
        "slug": "programming-basics",
        "count": "3"
      }
    ],
    "tags": [
      {
        "id": "2089000000000000002",
        "name": "Java",
        "slug": "java",
        "count": "2"
      }
    ]
  },
  "message": "ok"
}
```

`count` 表示当前访问者使用该筛选项能够查询到的教程书数量。没有可见教程书的分类、标签不会返回。

教程书本身不直接维护标签；教程书标签由其已发布文章的标签汇总得到。

### 3.3 分页查询教程书

```http
POST /blog/front/books/page
Content-Type: application/json
```

请求参数：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `current` | number | 否 | 当前页，默认 1 |
| `pageSize` | number | 否 | 每页数量，默认 10，最大 20 |
| `keyword` | string | 否 | 模糊匹配书名或摘要 |
| `categoryId` | string | 否 | 教程分类 ID |
| `tagId` | string | 否 | 文章标签 ID；书内至少一篇可见文章带该标签即可命中 |
| `accessType` | string | 否 | `free` 或 `member` |
| `sort` | string | 否 | `default`、`latest`、`popular` |

排序规则：

- `default`：后台排序优先，然后按更新时间。
- `latest`：按教程书更新时间倒序。
- `popular`：按书内文章的有效阅读事件总数倒序。

请求示例：

```json
{
  "current": 1,
  "pageSize": 12,
  "keyword": "Java",
  "categoryId": "2089000000000000001",
  "tagId": "2089000000000000002",
  "accessType": "free",
  "sort": "popular"
}
```

核心响应类型：

```ts
interface FrontTaxonomy {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  coverUrl?: string | null;
}

interface FrontBookListItem {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverUrl?: string | null;
  category: FrontTaxonomy;
  tags: FrontTaxonomy[];
  memberOnly: 0 | 1;
  accessType: 'free' | 'member';
  canAccessAll: boolean;
  chapterCount: number;
  publishedPostCount: number;
  freePostCount: number;
  memberPostCount: number;
  favorited: boolean;
  favoriteCount: number;
  updateTime: string;
}
```

`canAccessAll=false` 表示当前用户不能阅读书中的全部文章，原因可能是教程书为会员专享，或免费教程中存在会员文章。教程目录和元数据仍可展示，正文必须以文章详情接口的鉴权结果为准。

### 3.4 查询教程书目录

```http
GET /blog/front/books/{bookId}
```

示例：

```http
GET /blog/front/books/2089574991362678786
```

响应在教程书列表字段基础上增加：

```ts
interface FrontChapter {
  id: string;
  title: string;
  description?: string | null;
  sort: number;
  postCount: number;
  posts: FrontPostOutline[];
}

interface FrontBookDetail extends FrontBookListItem {
  seoTitle?: string | null;
  seoDescription?: string | null;
  chapters: FrontChapter[];
}
```

目录规则：

- 章节和文章已按后台编排顺序返回，前端不需要重新排序。
- 没有已发布可见文章的空章节不会返回。
- 草稿和已下线文章不会出现在目录中。
- 教程书停用后，该接口返回 `40400`。
- 会员文章会保留在目录中，但无权限用户看到 `canAccess=false`。

### 3.5 分页查询文章

```http
POST /blog/front/posts/page
Content-Type: application/json
```

请求参数：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `current` | number | 否 | 当前页，默认 1 |
| `pageSize` | number | 否 | 每页数量，默认 10，最大 20 |
| `keyword` | string | 否 | 模糊匹配标题或摘要 |
| `categoryId` | string | 否 | 分类 ID |
| `tagId` | string | 否 | 标签 ID |
| `memberOnly` | 0 \| 1 | 否 | 0 为免费，1 为会员专享 |
| `standaloneOnly` | boolean | 否 | 默认 `true`，只查独立文章；设为 `false` 时查询独立文章和书内文章 |
| `sort` | string | 否 | `latest` 或 `popular` |

独立文章列表示例：

```json
{
  "current": 1,
  "pageSize": 12,
  "memberOnly": 0,
  "sort": "latest"
}
```

查询全部已发布文章示例：

```json
{
  "current": 1,
  "pageSize": 20,
  "standaloneOnly": false,
  "sort": "popular"
}
```

文章概要类型：

```ts
interface FrontPostOutline {
  id: string;
  categoryId: string;
  bookId?: string | null;
  bookTitle?: string | null;
  bookSlug?: string | null;
  chapterId?: string | null;
  chapterTitle?: string | null;
  chapterSort?: number | null;
  title: string;
  slug: string;
  summary?: string | null;
  coverUrl?: string | null;
  tags: FrontTaxonomy[];
  memberOnly: 0 | 1;
  canAccess: boolean;
  favorited: boolean;
  favoriteCount: number;
  publishedAt: string;
  readCount: string;
  uniqueReaderCount: string;
}
```

独立文章的 `bookId`、`bookTitle`、`chapterId`、`chapterTitle` 为 `null`。

### 3.6 查询文章正文

```http
GET /blog/front/posts/{postId}
```

这是文章阅读权限的最终判断接口。只有鉴权成功时才返回 `contentHtml`；获取正文不再自动增加阅读量。

```ts
interface FrontPostNav {
  id: string;
  title: string;
  slug: string;
  memberOnly: 0 | 1;
  canAccess: boolean;
}

interface FrontPostDetail {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverUrl?: string | null;
  contentHtml: string;
  contentSchemaVersion: number;
  category: FrontTaxonomy;
  tags: FrontTaxonomy[];
  bookId?: string | null;
  bookTitle?: string | null;
  bookSlug?: string | null;
  chapterId?: string | null;
  chapterTitle?: string | null;
  memberOnly: 0 | 1;
  canAccess: true;
  favorited: boolean;
  favoriteCount: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  publishedAt: string;
  readCount: string;
  uniqueReaderCount: string;
  previousPost?: FrontPostNav | null;
  nextPost?: FrontPostNav | null;
}
```

注意：

- 接口只返回经过后端清理的 `contentHtml`，不会返回后台编辑器使用的 `contentJson`。
- `previousPost`、`nextPost` 按教程书目录顺序计算；相邻会员文章可能返回 `canAccess=false`。
- 独立文章没有上一篇、下一篇教程导航。
- 前端可将 `contentHtml` 放入专用文章容器渲染，并为代码块、图片、视频、表格编写统一样式。

### 3.7 上报有效阅读

文章正文成功加载后，前台仅累计页面处于可见状态的阅读时间。达到 10 秒时调用：

```http
POST /blog/front/posts/read
Content-Type: application/json

{
  "postId": "2089701861377863691",
  "visitorId": "浏览器本地保存的稳定访客ID",
  "durationSeconds": 10
}
```

匿名访客必须传 `visitorId`，格式为 16～128 位字母、数字、下划线或中划线；登录用户也建议继续传递。请求需携带现有登录凭证，使后端可以优先按用户 ID 去重。

响应：

```ts
interface PostReadResult {
  /** 本次是否新增有效阅读；同一读者当天重复上报时为 false */
  counted: boolean;
  /** 该文章累计有效阅读次数（按读者、文章、自然日去重） */
  readCount: string;
  /** 该文章累计独立读者数 */
  uniqueReaderCount: string;
}
```

后端会再次检查文章发布状态、可见范围、教程书状态和会员权限。`counted=false` 是正常的幂等成功，不应当提示错误或重试。

### 3.8 教程书与文章收藏

以下接口均要求登录并携带 `Authorization: Bearer <token>`。

| 操作 | 方法与路径 | 请求参数 |
|---|---|---|
| 收藏教程书 | `POST /blog/front/books/favorite/add` | `{ "bookId": "..." }` |
| 取消收藏教程书 | `POST /blog/front/books/favorite/cancel` | `{ "bookId": "..." }` |
| 检查教程书收藏 | `GET /blog/front/books/favorite/check?bookId=...` | query |
| 我的教程书收藏 | `POST /blog/front/books/favorite/my/page` | 与教程书分页筛选参数相同 |
| 收藏文章 | `POST /blog/front/posts/favorite/add` | `{ "postId": "..." }` |
| 取消收藏文章 | `POST /blog/front/posts/favorite/cancel` | `{ "postId": "..." }` |
| 检查文章收藏 | `GET /blog/front/posts/favorite/check?postId=...` | query |
| 我的文章收藏 | `POST /blog/front/posts/favorite/my/page` | 与文章分页筛选参数相同；自动查询独立及书内文章 |

收藏和取消收藏都是幂等操作，重复请求仍返回 `true`。教程书或文章下线后不会出现在“我的收藏”列表，但收藏关系会保留；内容重新公开后会再次出现。

教程书列表/详情和文章列表/详情均返回：

```ts
interface FavoriteState {
  favorited: boolean;   // 匿名访问固定为 false
  favoriteCount: number;
}
```

推荐先使用列表或详情返回的 `favorited` 初始化按钮状态，点击后乐观更新，并以接口成功响应为准；不需要额外调用 `check`。`check` 主要用于只持有目标 ID、尚未加载详情的页面。

React 渲染示例：

```tsx
<article
  className="tutorial-article"
  dangerouslySetInnerHTML={{ __html: post.contentHtml }}
/>
```

## 4. 权限与错误处理

| code | 场景 | 前端建议 |
|---|---|---|
| `0` | 成功 | 正常使用 `data` |
| `40000` | 参数错误，例如分页超过 20 或筛选值不支持 | 显示参数错误或恢复默认筛选 |
| `40100` | 登录可见文章，但当前未登录或 Token 已失效 | 打开登录框，登录后重试原请求 |
| `40300` | 会员专享文章，当前用户没有有效会员 | 展示会员权益及开通入口 |
| `40400` | 草稿、已下线、不可见文章、停用教程书或不存在的数据 | 展示内容不存在/已下线页面 |
| `50000` | 服务端异常 | 展示重试提示并上报日志 |

不要根据单个 `memberOnly` 字段在前端自行放行正文。后端会同时检查教程书权限、文章权限、会员状态、会员有效期、文章状态和教程书状态。

推荐处理函数：

```ts
class ApiBusinessError extends Error {
  constructor(public code: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const result = (await response.json()) as BaseResponse<T>;
  if (result.code !== 0 || result.data === null) {
    throw new ApiBusinessError(result.code, result.message || '请求失败');
  }
  return result.data;
}
```

文章详情页面可按业务码分流：

```ts
try {
  const post = await request<FrontPostDetail>(`/blog/front/posts/${postId}`);
  setPost(post);
} catch (error) {
  if (error instanceof ApiBusinessError) {
    if (error.code === 40100) openLoginModal();
    else if (error.code === 40300) openMembershipModal();
    else if (error.code === 40400) navigate('/404');
    else showError(error.message);
  }
}
```

## 5. 可直接复用的 API 封装

```ts
export const tutorialApi = {
  getOverview: () =>
    request<BlogFrontOverview>('/blog/front/overview'),

  getFilters: () =>
    request<{
      categories: Array<{ id: string; name: string; slug: string; count: string }>;
      tags: Array<{ id: string; name: string; slug: string; count: string }>;
    }>('/blog/front/filters'),

  pageBooks: (params: Record<string, unknown>) =>
    request<PageResult<FrontBookListItem>>('/blog/front/books/page', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getBook: (bookId: string) =>
    request<FrontBookDetail>(`/blog/front/books/${bookId}`),

  pagePosts: (params: Record<string, unknown>) =>
    request<PageResult<FrontPostOutline>>('/blog/front/posts/page', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  getPost: (postId: string) =>
    request<FrontPostDetail>(`/blog/front/posts/${postId}`),

  favoriteBook: (bookId: string) =>
    request<boolean>('/blog/front/books/favorite/add', {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    }),

  cancelFavoriteBook: (bookId: string) =>
    request<boolean>('/blog/front/books/favorite/cancel', {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    }),

  pageMyFavoriteBooks: (params: Record<string, unknown>) =>
    request<PageResult<FrontBookListItem>>('/blog/front/books/favorite/my/page', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  favoritePost: (postId: string) =>
    request<boolean>('/blog/front/posts/favorite/add', {
      method: 'POST',
      body: JSON.stringify({ postId }),
    }),

  cancelFavoritePost: (postId: string) =>
    request<boolean>('/blog/front/posts/favorite/cancel', {
      method: 'POST',
      body: JSON.stringify({ postId }),
    }),

  pageMyFavoritePosts: (params: Record<string, unknown>) =>
    request<PageResult<FrontPostOutline>>('/blog/front/posts/favorite/my/page', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
};
```

## 6. 前端展示建议

- 教程书卡片使用 `accessType` 展示“免费教程”或“会员专享”角标。
- 目录和文章列表使用 `memberOnly` 展示会员图标，使用 `canAccess` 决定是否显示锁定样式。
- 免费教程也可能包含会员文章；不要只看教程书角标判断某篇文章能否阅读全文。
- 文章详情优先使用 `seoTitle`、`seoDescription` 设置页面 SEO，缺失时回退到 `title`、`summary`。
- 代码块建议提供语法高亮和复制按钮；图片设置最大宽度，视频使用响应式容器。
- 带用户权限差异的响应不要跨用户共享缓存，尤其是目录的 `canAccess`、`favorited` 和文章正文。
- 用户登录或会员开通成功后，应重新请求当前目录和文章详情，不要沿用匿名缓存结果。

## 7. 当前范围

本轮后端不包含前台页面、评论、阅读进度和全文搜索高亮。现有能力覆盖：

- 教程书统计、筛选和分页；
- 分类及由文章汇总的标签筛选；
- 教程书章节目录；
- 独立文章和全部文章分页；
- 免费、登录可见、会员专享和管理员可见权限；
- 文章 HTML、上一篇/下一篇、停留 10 秒后的有效阅读上报及独立读者统计。
- 教程书和文章的收藏、取消收藏、收藏状态、收藏数及“我的收藏”分页。
