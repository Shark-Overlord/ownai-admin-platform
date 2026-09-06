# 社区、新闻与公告使用及接口指南

更新日期：2026-09-06。社区功能已经同时接入用户前台、管理后台和业务后端：

- 用户前台：`web-frontend/`，本地地址 `http://127.0.0.1:5187/#/profile`。
- 管理后台：`web-admin/`，本地地址 `http://127.0.0.1:5173`。
- 业务后端：仓库根目录，统一接口前缀 `/api`，本地端口 `8011`。

本文档是社区帖子、评论、新闻和公告的当前说明。历史规划及单次发布说明
不再作为开发依据；通用开发和发布流程见
[`OWNAI_DEVELOPMENT_AND_DEPLOYMENT.md`](OWNAI_DEVELOPMENT_AND_DEPLOYMENT.md)。

## 用户前台

个人中心默认进入“新闻与帖子”，左侧同时提供“社区公告”“我的互动”
“个人资料”和“订单”。“我的下载”已经取消，资源下载记录仍在原资源页面
处理。

- 新闻与帖子支持最新、最受欢迎、分类和搜索；置顶帖子在两种排序中都优先
  显示。
- 列表从 Markdown 自动提取摘要、首张 HTTPS 图片或首个 `video` 代码块，
  后台不需要单独设置封面。
- 详情在居中面板中展示完整 Markdown、图片、视频、评论、回复、点赞和举报。
- “我的互动”包含“我的评论”和“我赞过的”，返回列表后保留筛选与阅读位置，
  进入原讨论可以定位目标评论。
- 公告与帖子采用一致的信息流样式；重要公告可以通过居中模态框提醒。
- 帖子和公告作者均使用创建人的真实昵称及头像；官方内容由后端返回
  `official=true`，前端不自行伪造官方身份。

## 管理后台

### 新闻与帖子

入口为“新闻与互动 → 新闻与帖子”，包含帖子列表、分类管理和标签管理。
分类与教程分类相互独立，发布时必须选择一个主分类，最多关联 20 个标签。
停用分类或标签只限制新增关联；已被版本引用的项目不能直接删除。

编辑器只要求标题、摘要、分类、标签、Markdown 和评论开关。图片或视频上传
后直接插入 Markdown；预览图和列表媒体都从正文提取，无需维护独立封面。

保存草稿会创建不可变内容版本，发布操作才切换线上版本。修改已发布帖子时，
用户仍看到旧线上版本，直到管理员再次发布。保存、发布、下线、删除、置顶和
取消置顶都使用版本号进行乐观锁校验，过期编辑会被拒绝。

“最新”按首次发布时间倒序；“最受欢迎”按可见评论数、点赞数、首次发布
时间和 ID 排序。置顶内容始终先显示。重新发布不会重置首次发布时间。

已发布帖子可以生成公告草稿。生成操作复制线上标题、摘要和帖子关联，
不会自动发布或自动启用弹窗，也不会随帖子后续编辑变化。

### 公告

日常公告只需要标题、摘要和 Markdown 正文。链接直接写入 Markdown；旧数据
中的按钮文字和跳转路径继续兼容，但不再作为日常必填项。定时发布、过期时间、
优先级和弹窗提醒收在更多设置中。

普通公告进入公告列表；只有明确启用 `popupEnabled` 的重要公告才参与自动
弹窗。弹窗关闭与正文已读分别记录，关闭弹窗不等于已读正文。

### 评论管理

正常登录账号可以评论、回复、点赞和举报。管理员回复由后端标记为官方。
后台可以隐藏或恢复评论，并单独处理举报说明。隐藏主评论后整条讨论不可见；
恢复主评论不会自动恢复其中被单独隐藏的回复。

关闭帖子评论只阻止新增评论和回复，历史内容保留。帖子下线或逻辑删除后，
公开读取和互动同时停止。

## 社区接口

接口统一前缀 `/api/community`。返回结构为 `{code,data,message}`。所有业务
ID 都是十进制字符串，JavaScript 不得转为 `Number`；分页数量和互动计数
可在显示时转换。

### 公开读取与登录互动

| 方法与路径 | 登录 | 说明 |
| --- | --- | --- |
| `POST /post/list/page` | 否 | `{current,pageSize,keyword?,categoryId?,tagId?,sort:"latest"或"popular"}`；返回摘要、分类标签、作者、置顶、首个预览媒体及互动数 |
| `GET /post/get?id=...` | 否 | 获取线上 Markdown 详情、作者、评论开关和当前用户点赞状态 |
| `GET /taxonomy/category`、`/taxonomy/tag` | 否 | 获取可用于公开筛选的分类或标签及帖子数量 |
| `POST /comment/list/page` | 否 | 分页主评论；传 `rootId` 时分页该主评论的回复 |
| `GET /comment/context?postId=...&id=...` | 否 | 获取可见目标评论及主楼，用于从“我的互动”定位原讨论 |
| `POST /comment/add` | 是 | `{postId,replyToId?,content,requestKey}`；正文 1–2000 字符 |
| `POST /like` | 是 | `{postId,liked}`；幂等设置当前账号点赞状态 |
| `POST /report` | 是 | `{commentId,reason}`；同账号同评论只保留一条举报 |
| `POST /me/comments/list/page` | 是 | 当前账号发表的评论和回复 |
| `POST /me/likes/list/page` | 是 | 当前账号赞过的公开帖子 |

`requestKey` 使用 8–80 位字母、数字、横线或下划线，推荐客户端 UUID。
失败重试必须沿用原键；同一键更换内容、帖子或回复目标会被拒绝。评论和举报
均有数据库限频。评论内容按纯文本返回，前端只能通过文本节点渲染。

### 管理接口

以下接口全部要求 `admin`：

| 方法与路径 | 说明 |
| --- | --- |
| `POST /admin/post/list/page`、`GET /admin/post/get` | 查询草稿、线上版本、版本号和未发布变更 |
| `POST /admin/post/save` | 保存新帖子或最新版本草稿 |
| `POST /admin/post/publish`、`/offline`、`/delete` | 发布、下线或逻辑删除 |
| `POST /admin/post/pin`、`/unpin` | 置顶或取消置顶，传 `{id,version}` |
| `POST /admin/post/announcement` | 从已发布版本生成公告草稿 |
| `GET /admin/taxonomy/{kind}` | 查询完整分类或标签，`kind` 为 `category` 或 `tag` |
| `POST /admin/taxonomy/{kind}/save`、`/delete` | 保存、停用或删除分类标签 |
| `POST /admin/comment/list/page`、`/moderate` | 查询及隐藏/恢复评论 |
| `POST /admin/report/list/page`、`/resolve` | 查询及处理举报 |

用户身份、作者 ID、官方标记和互动数量全部由服务端产生，不接受客户端指定。

## 新闻弹窗与公告接口

`/api/news` 提供公开新闻流和重要公告弹窗，`/api/announcement` 提供登录用户
公告列表及已读状态。二者继续使用同一公告数据源，但承担不同的读取场景。

| 方法与路径 | 登录 | 说明 |
| --- | --- | --- |
| `POST /api/news/list/page` | 否 | 公开新闻分页，不返回完整正文 |
| `GET /api/news/get?id=...` | 否 | 获取公开新闻完整正文 |
| `POST /api/news/popup/candidate` | 否 | 传 `{ids:[已关闭ID]}`，返回优先级最高的候选或 `null` |
| `POST /api/news/popup/dismiss` | 是 | 幂等同步当前账号关闭过的公告 ID |
| `POST /api/announcement/list/page` | 是 | 当前用户的已发布公告分页，包含 `readStatus` |
| `GET /api/announcement/get?id=...` | 是 | 公告详情 |
| `POST /api/announcement/read` | 是 | 标记单条已读 |
| `POST /api/announcement/read/all` | 是 | 全部标为已读 |
| `GET /api/announcement/unread/count` | 是 | 未读数量 |

公开新闻必须已发布、允许公开、发布时间已到且尚未过期。弹窗候选还要求
`popupEnabled=true`，按优先级、发布时间和 ID 倒序。排除 ID 最多 500 个；
游客关闭记录保存在浏览器，登录后再通过 `popup/dismiss` 同步。

## Markdown 媒体与安全

正文保存原始 Markdown，帖子最多 200000 字符，不执行原始 HTML。支持
CommonMark 标题、列表、链接和图片；只允许 HTTPS 外部媒体、HTTPS 外链、
站内绝对路径和锚点。

图片写法：

```markdown
![图片说明](https://example.com/image.png)
```

视频使用只包含一个 HTTPS 视频地址的代码块：

````markdown
```video
https://example.com/demo.mp4
```
````

视频使用 `controls` 和 `preload="metadata"`，不自动播放。图片及视频上传沿用
`blog_image`、`blog_video` 的文件类型、大小和对象存储规则。

## 数据库与验证

全新环境依次核对并执行：

1. `sql/community.sql`：社区基础表和公告关联字段。
2. `sql/news_public_popup.sql`：公开新闻字段和弹窗关闭记录。
3. `sql/community_profile_upgrade.sql`：置顶字段及索引。

生产环境已经执行过这些增量脚本，不得未经核对直接重跑一次性建表脚本。
回退应用时保留社区、评论、举报、关闭记录和用户互动数据。

后端重点测试：

```powershell
.\mvnw.cmd -B '-Dtest=CommunityServiceTest,NewsServiceTest,AnnouncementNewsValidationTest,UserMembershipQueryTest' test
```

然后构建 `web-admin/` 与 `web-frontend/`，检查桌面端、390px 移动端、深浅
主题、列表筛选、置顶、详情、评论回复、我的互动、公告列表和居中弹窗。
