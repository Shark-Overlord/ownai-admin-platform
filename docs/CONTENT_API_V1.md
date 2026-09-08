# OwnAI 统一内容 API v1

更新时间：2026-09-08

这组接口供外部 Agent、导入脚本和受信任的内容工具使用。调用方只需要服务地址和内容 API 密钥，不需要管理员 Token，也不依赖浏览器登录状态。

写入结果直接进入新闻与帖子、作品、视频素材、Prompt 资产、教程各自已有的草稿状态。管理员仍在各模块原来的管理页面预览和发布；系统不增加独立的“Agent 内容审核”流程。

## 1. 地址与鉴权

部署后端前，需先在目标数据库执行兼容性增量脚本 [`sql/content_module_draft_bridge.sql`](../sql/content_module_draft_bridge.sql)。该脚本只新增草稿映射表，不修改现有内容表和数据。

生产环境基础地址：

```text
https://admin.ownai.icu/api/content/v1
```

所有请求只接受以下请求头中的密钥：

```http
X-Content-Asset-Key: <API_KEY>
```

新接口不接受 URL 参数或 JSON 请求体中的密钥。密钥必须处于启用、未过期状态，并具有本次操作所需权限。

常用权限按模块拆分为 `read`、`add`、`update`、`upload`，例如：

```text
artwork:read, artwork:add, artwork:update, artwork:upload
prompt_asset:read, prompt_asset:add, prompt_asset:update, prompt_asset:upload
video_background:read, video_background:add, video_background:update, video_background:upload
community_post:read, community_post:add, community_post:update, community_post:upload
tutorial:read, tutorial:add, tutorial:update, tutorial:upload
taxonomy:read
```

## 2. 接口总览

| 方法与路径 | 用途 |
|---|---|
| `GET /capabilities` | 查询当前密钥权限、资源类型、可写字段和草稿约定 |
| `GET /taxonomy` | 查询各模块分类和标签 |
| `POST /resources/{type}/list` | 分页查询资源，包含后台可见的草稿 |
| `GET /resources/{type}/{id}` | 查询编辑详情和当前版本标识 |
| `POST /resources/{type}` | 新增内容草稿 |
| `PATCH /resources/{type}/{id}` | 局部更新草稿，必须携带 `If-Match` |
| `POST /uploads?biz={biz}` | 上传图片、视频或附件，表单字段名为 `file` |

资源类型：

```text
artwork
prompt_asset
video_background
community_post
tutorial_book
tutorial_chapter
tutorial_post
```

统一返回格式：

```json
{
  "code": 0,
  "data": {},
  "message": "ok"
}
```

业务 ID 始终按十进制整数传入路径；调用方保存时建议按字符串处理，避免 JavaScript 长整数精度损失。

## 3. 查询与版本控制

分页查询示例：

```bash
curl -X POST "https://admin.ownai.icu/api/content/v1/resources/prompt_asset/list" \
  -H "X-Content-Asset-Key: $OWNAI_CONTENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"current":1,"pageSize":20,"keyword":"海报","status":0}'
```

列表查询支持通用字段 `current`、`pageSize`、`keyword`、`status`、`categoryId`、`tagId`、`tagIdList`、`memberOnly`，教程还支持 `bookId`、`chapterId`，Prompt 支持 `assetType`。不适用于当前资源类型的筛选会被忽略。

详情响应包含：

```json
{
  "resourceType": "prompt_asset",
  "id": "123",
  "version": "<64位十六进制摘要>",
  "resource": {
    "title": "示例 Prompt",
    "status": 0
  }
}
```

更新时必须把刚查询到的 `version` 原样放进 `If-Match`。资源被其他人修改后，旧版本更新会被拒绝，不会覆盖新内容。

```bash
curl -X PATCH "https://admin.ownai.icu/api/content/v1/resources/prompt_asset/123" \
  -H "X-Content-Asset-Key: $OWNAI_CONTENT_API_KEY" \
  -H "If-Match: <VERSION>" \
  -H "Content-Type: application/json" \
  -d '{"title":"修改后的标题","summary":""}'
```

局部更新规则：

- 省略字段保持原值。
- 数组字段整体替换；传 `[]` 表示清空关联。
- 可清空文本传空字符串 `""`。
- 不接受 `null`；不接受 `status`、作者、统计值、发布时间等受保护字段。
- 不提供发布、删除、下线接口。

## 4. 新增草稿示例

### Prompt 资产

```bash
curl -X POST "https://admin.ownai.icu/api/content/v1/resources/prompt_asset" \
  -H "X-Content-Asset-Key: $OWNAI_CONTENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "assetType":"image_prompt",
    "categoryId":"12",
    "title":"电影感城市夜景",
    "summary":"用于生成城市夜景海报",
    "promptContent":"cinematic city at night...",
    "coverUrl":"https://example.com/cover.webp",
    "memberOnly":0,
    "sceneTagIdList":["31"],
    "assetTagIdList":["42"]
  }'
```

服务端强制保存为草稿，客户端传入 `status` 会直接报错。

### 作品

```bash
curl -X POST "https://admin.ownai.icu/api/content/v1/resources/artwork" \
  -H "X-Content-Asset-Key: $OWNAI_CONTENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "externalKey":"agent-demo-001",
    "title":"交互按钮示例",
    "summary":"CSS 交互组件",
    "coverUrl":"https://example.com/cover.webp",
    "htmlUrl":"https://example.com/demo.html",
    "categoryId":"8",
    "tagIdList":["15"]
  }'
```

### 教程书、章节和文章

教程需要按顺序创建，后一次请求使用前一次返回的正式 ID：

```bash
# 1. 新建禁用状态的教程书
curl -X POST "https://admin.ownai.icu/api/content/v1/resources/tutorial_book" \
  -H "X-Content-Asset-Key: $OWNAI_CONTENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title":"测试教程书","slug":"agent-test-book","summary":"API 测试草稿","categoryId":"2"}'

# 2. 在该书下新建章节
curl -X POST "https://admin.ownai.icu/api/content/v1/resources/tutorial_chapter" \
  -H "X-Content-Asset-Key: $OWNAI_CONTENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"<BOOK_ID>","title":"第一章","description":"入门","sort":1}'

# 3. 新建 Markdown 教程文章
curl -X POST "https://admin.ownai.icu/api/content/v1/resources/tutorial_post" \
  -H "X-Content-Asset-Key: $OWNAI_CONTENT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"chapterId":"<CHAPTER_ID>","categoryId":"2","title":"第一篇","slug":"first-post","summary":"教程草稿","markdown":"# 标题\n\n正文内容"}'
```

教程正文优先传 `markdown`。后端统一生成后台可继续编辑的 Tiptap JSON 和清理后的 HTML；支持标题、段落、列表、引用、代码块、链接、HTTPS 图片、表格和约定的视频代码块。

## 5. 上传素材

```bash
curl -X POST "https://admin.ownai.icu/api/content/v1/uploads?biz=prompt_asset_cover" \
  -H "X-Content-Asset-Key: $OWNAI_CONTENT_API_KEY" \
  -F "file=@./cover.webp"
```

可用 `biz`：

- 作品：`artwork_cover`、`artwork_video`、`artwork_prompt`、`artwork_source`
- Prompt：`prompt_asset_cover`
- 视频素材：`video_background_cover`、`video_background_preview`、`video_background_source`
- 帖子和教程：`blog_image`、`blog_video`

头像和图片生成结果不允许通过内容密钥上传。文件格式、大小、对象路径、视频处理和本地开发回退行为复用原上传规则。

## 6. 当前发布兼容边界

- `community_post` 已有线上版本与草稿版本分离，Agent 可以在已发布帖子上保存未发布修改，旧版继续在线。
- 新建的作品、Prompt、视频素材和教程都能进入各自原生草稿，并由原管理页面发布。
- 已发布的作品、Prompt、视频素材和教程文章会生成一个原生草稿副本。副本出现在对应模块原管理列表中；管理员可继续编辑并使用原发布按钮。发布时内容写回原资源 ID，线上地址、收藏和统计归属不变，草稿副本随后在同一事务中清理。
- 原管理列表会在正式记录上显示“有未发布修改”，在草稿副本上显示“待更新已发布内容”；这只是原模块内的状态提示，不是新增审核中心或来源标记。
- 草稿创建后如果原线上记录又被其他操作修改，发布会提示冲突并整单回滚，不覆盖较新的线上数据。
- 已启用教程书的资料和章节结构目前仍拒绝通过 Agent 修改；它们需要按整本教程目录处理，不能复制单个章节到已启用目录后提前暴露。
- 旧的作品和 Prompt 密钥写入接口仅作为迁移入口保留：密钥新增会被强制设为草稿，密钥不能更新已发布内容，也不能通过 `status` 绕过发布。管理员登录态接口保持原行为。

## 7. Agent 调用建议

1. 调用 `/capabilities`，确认资源和字段能力。
2. 调用 `/taxonomy` 获取当前真实分类、标签 ID，不把文档示例 ID 写死。
3. 上传所需素材并保存返回 URL。
4. 新增草稿，或先查询详情取得 `version` 再局部更新。
5. 输出资源类型、草稿 ID、标题和原模块后台入口，交给管理员预览和发布。
6. 遇到版本冲突时重新查询并基于最新数据重做修改，不自动覆盖。

## 8. Python 客户端

仓库提供无第三方依赖的 [`scripts/ownai_content_client.py`](../scripts/ownai_content_client.py)。配置：

```powershell
$env:OWNAI_BASE_URL = 'http://127.0.0.1:8011/api'
$env:OWNAI_CONTENT_API_KEY = '<创建密钥时显示的明文>'
```

常用命令：

```powershell
python scripts/ownai_content_client.py capabilities
python scripts/ownai_content_client.py taxonomy
python scripts/ownai_content_client.py list prompt_asset --json query.json
python scripts/ownai_content_client.py get prompt_asset 123
python scripts/ownai_content_client.py add prompt_asset prompt.json
python scripts/ownai_content_client.py update prompt_asset 123 patch.json --version '<VERSION>'
python scripts/ownai_content_client.py upload prompt_asset_cover .\cover.webp
```

`OWNAI_BASE_URL` 可以填写站点 `/api` 根地址，也可以直接填写完整的 `/api/content/v1` 地址。客户端只向标准输出写成功 JSON，错误写入标准错误，不输出密钥。
