# Content External API 改进计划

更新日期：2026-09-17

## 背景

当前通过 API 密钥 + `/api/content/v1` 统一接口让 Agent 自动更新网站内容。
Agent 只负责上传草稿，内容审核和发布由管理员在后台手动完成。

现有接口结构合理，但存在以下缺口需要改进。

## 改进范围（三项）

---

### 改进 1：远程 URL 导入接口

**问题：** Agent 拿到图片 URL（如 AI 生成结果）时，需要本地下载再调用 `/uploads` 上传，
流程繁琐且 Agent 需要处理二进制文件。

**方案：** 新增端点让服务端直接抓取远程 URL 并上传到 COS，返回 COS URL。

**新增端点：**
```
POST /api/content/v1/uploads/remote
Content-Type: application/json
X-Content-Asset-Key: oak_xxx

{ "url": "https://example.com/image.png", "biz": "artwork_cover" }
```

**返回：** 与 `/uploads` 相同格式，`data` 为 COS URL 字符串。

**支持的 biz（仅图片类）：**

| biz | 所需 scope |
| --- | --- |
| `artwork_cover` | `artwork:upload` |
| `prompt_asset_cover` | `prompt_asset:upload` |
| `video_background_cover` | `video_background:upload` |
| `blog_image` | `community_post:upload` 或 `tutorial:upload` |

视频/zip 不支持（文件太大，下载超时风险高）。

**实现：**
- 复用 `RemoteImageImportService` 的下载 + 安全校验 + COS 上传逻辑
- 在 `RemoteImageImportService` 新增 `importForContent(url, biz, userId)` 公开方法，
  按 `biz` 路由 COS 路径（不再硬编码 `blog_image/`）

**涉及文件：**
- `RemoteImageImportService.java` — 新增 `importForContent()` 方法
- `ContentExternalController.java` — 新增端点
- 新增 DTO：`model/dto/contentapi/RemoteUploadRequest.java`（`url` + `biz`）

---

### 改进 2：幂等新增（externalId）

**问题：** Agent 重跑任务时，无法判断内容是否已存在，需要自己维护映射表，容易产生重复内容。

**方案：** 新增时支持传 `externalId`（调用方自己的唯一键），服务端若已存在则直接返回已有记录，不重复创建。

**请求体新增可选字段：**
```json
{
  "externalId": "agent_source_abc123",
  "title": "...",
  "coverUrl": "..."
}
```

**返回额外字段：**
```json
{
  "id": "123",
  "externalId": "agent_source_abc123",
  "created": true
}
```

**artwork 已有 `externalKey` 字段**，直接沿用（字段名对齐为 `externalId`，后端兼容两个名称）。
**prompt_asset / video_background** 需新增字段。

**需要增量 SQL 迁移：**

```sql
-- prompt_asset 表
ALTER TABLE prompt_asset
  ADD COLUMN externalId VARCHAR(128) NULL DEFAULT NULL COMMENT '外部唯一键（agent 幂等新增用）' AFTER id,
  ADD UNIQUE KEY uq_prompt_asset_external_id (externalId);

-- video_background 表
ALTER TABLE video_background
  ADD COLUMN externalId VARCHAR(128) NULL DEFAULT NULL COMMENT '外部唯一键（agent 幂等新增用）' AFTER id,
  ADD UNIQUE KEY uq_video_background_external_id (externalId);
```

**涉及文件：**
- `sql/content_api_external_id_migration.sql` — 新增迁移文件
- `PromptAsset.java` — 新增 `externalId` 字段
- `VideoBackground.java` — 新增 `externalId` 字段
- `ContentResourceVO.java` — 新增 `externalId`、`created` 字段
- `ContentExternalService.java` — `add()` 方法增加幂等查询逻辑

---

### 改进 3：分类管理接口（供 agent 新增 / 查询 / 修改作品分类）

**问题：** 现有 `/category/add`、`/category/update` 等接口只接受管理员 Session 登录态，
Agent 无法调用。但 Agent 需要能灵活管理作品分类（增减分类、修改名称/排序）。

**方案：** 在 `/content/v1` 下新增分类管理端点，使用内容密钥鉴权，新增专用 scope `category:manage`。

**新增端点：**

```
# 查询全部分类（含二级标签）
GET  /api/content/v1/categories

# 新增分类
POST /api/content/v1/categories
{ "name": "交互动效", "description": "...", "sort": 10 }

# 修改分类
PATCH /api/content/v1/categories/{id}
{ "name": "新名称", "sort": 20 }

# 向分类添加二级标签（标签不存在时自动创建）
POST /api/content/v1/categories/{id}/tags
{ "tagName": "卡片悬浮" }

# 解绑分类下的标签（无其他分类引用时自动删除标签）
DELETE /api/content/v1/categories/{id}/tags/{tagId}
```

**所需 scope：** 全部端点统一使用新增的 `category:manage` scope。

查询分类已有公开接口 `GET /category/list`，但该端点纳入 content/v1 统一提供
完整字段（含 `sort`、`description`、`tagList`）供 agent 引用。

**涉及文件：**
- `ContentApiKeyService.java` — 新增 `SCOPE_CATEGORY_MANAGE = "category:manage"` 常量
- `ContentExternalController.java` — 新增 5 个端点
- `ContentExternalService.java` — 新增 `listCategories()` / `addCategory()` / `updateCategory()` / `addTagToCategory()` / `removeTagFromCategory()` 方法，委托给已有 `CategoryService` / `TagService`

---

## 优先级与实施顺序

| 批次 | 改进项 | 价值 | 工作量 | 是否需 DB 迁移 |
| --- | --- | --- | --- | --- |
| 第一批 | 远程 URL 导入 | 高 | 小 | 否 |
| 第一批 | 分类管理接口 | 高 | 小 | 否 |
| 第二批 | 幂等新增（externalId） | 高 | 中 | **是** |

第一批不涉及数据库，风险低，优先实现。

## 验收标准

- [ ] `POST /uploads/remote` 传入 HTTPS 图片 URL，返回 COS URL
- [ ] 不支持的 biz（视频/zip）调用时返回 `40000` 参数错误
- [ ] `GET /content/v1/categories` 返回带标签的完整分类列表
- [ ] `POST /content/v1/categories` 新增分类成功，重名时返回 `40000`
- [ ] `PATCH /content/v1/categories/{id}` 修改分类名/排序成功
- [ ] `POST /content/v1/categories/{id}/tags` 添加标签成功，同名时返回 `40000`
- [ ] `DELETE /content/v1/categories/{id}/tags/{tagId}` 解绑标签，无引用时自动删除标签
- [ ] 幂等新增：相同 `externalId` 第二次调用返回 `created: false`，不产生重复记录
- [ ] 新 scope `category:manage` 在密钥管理页面可选
