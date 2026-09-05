# 系统公告、新闻与帖子后台

本期只修改 Spring Boot 与 `web-admin`。用户网站页面、全局通知交互及邮件群发不在本期。用户前台尚未接入，因此发布帖子目前只使后端公开接口可读，不会自动在网站导航中出现。

## 后台使用

- **新闻与互动 → 新闻与帖子**：帖子列表、分类管理、标签管理。分类与教程独立，单层结构；发布必选一个主分类，最多 20 个标签。停用只限制新增关联，引用过的分类、标签不能删除。
- **新建帖子**：填写标题、摘要、封面、分类、标签和 Markdown，上传图片或视频后插入正文；支持导入、导出 Markdown，预览图片失败会显示提示，视频失败保留原视频链接。
- **保存草稿 → 发布**：保存创建不可变内容版本，只有发布操作切换线上版本。编辑已经发布的帖子时，线上正文、封面、分类、标签和评论开关全部保留旧版。编辑器中的“线上版本”用于对照。未保存时不能发布。修改与发布带版本号，过期编辑会被拒绝，避免覆盖其他管理员的修改。
- **最新**按首次发布时间倒序；**最受欢迎**按累计可见评论（含回复）＋当前点赞排序，再按首次发布时间和 ID 倒序。编辑、下线后重新发布不会重置首次发布时间。后台列表显示草稿标题和分类，互动数量来自同一篇帖子的实际互动；公开接口始终按线上分类和标签筛选。
- **生成公告**：仅对已发布帖子开放，复制线上标题、摘要并关联帖子，生成普通公告草稿。公告标题最多 100 字符，超过时截短供管理员再编辑；正文采用摘要，空摘要时采用帖子标题。生成不发布、不启用弹窗，不随帖子后续编辑自动改变。
- **系统公告**：仍可独立发布使用说明、教程更新和插件更新。普通公告进入通知列表；手动开启弹窗才作为重要提醒。已读和关闭弹窗继续分别记录。关联帖子未接入用户前台时，可填写已经上线的站内按钮路径。
- **评论管理**：所有登录的正常账号可留言、回复及点赞。后台回复显示“官方”；可隐藏或恢复留言，隐藏主留言后整条讨论不可见，恢复主留言不会恢复单独隐藏的回复。举报处理说明与隐藏评论是独立操作。

关闭评论只阻止新增留言和回复，历史评论保留。帖子下线、逻辑删除后停止公开读取和所有互动。游客可读公开帖子与评论。教程、插件已有的会员校验保持原样。

## API 接入

统一前缀 `/api/community`；登录沿用 `Authorization: Bearer <token>`。返回沿用 `{code,data,message}`。所有 ID 为十进制字符串，禁止在 JavaScript 中转为 Number。项目全局 Long 序列化也会将 `total`、互动数量等返回为字符串，显示或分页时可对这些小范围计数使用 `Number()`。

### 公开及登录互动

| 方法与路径 | 请求与返回 |
| --- | --- |
| `POST /post/list/page` | `{current:1,pageSize:20,keyword?,categoryId?,tagId?,sort:"latest"或"popular"}`；返回 `{records,total,current,size}`，包含分类、标签、首次发布时间、点赞数、有效评论数和热度，不返回正文或后台字段 |
| `GET /post/get?id=...` | 返回线上详情、Markdown、`commentsEnabled`、当前用户 `liked`；草稿/下线/删除内容返回 40400 |
| `GET /taxonomy/category`、`/taxonomy/tag` | 启用的分类/标签，以及仍有公开帖子使用的停用项；包含公开帖子数量 |
| `POST /comment/list/page` | `{postId,current,pageSize,rootId?}`；不传 `rootId` 分页主留言，传主留言 ID 分页其平铺回复；返回 `replyToId`、作者展示名、官方标记和回复数量 |
| `POST /comment/add` | 登录；`{postId,replyToId?,content,requestKey}`；纯文本 1–2000 字符，`requestKey` 为 8–80 位字母数字、横线或下划线，推荐 UUID；成功返回评论 ID |
| `POST /like` | 登录；`{postId,liked:true或false}`；每账号每帖最多一个赞，可重复设置同一状态；返回当前状态及点赞数 |
| `POST /report` | 登录；`{commentId,reason}`，原因 1–500 字符；相同账号对同一评论只保留一个举报，重试返回原 ID |

评论请求键由客户端为每次提交生成，失败重试沿用原键；同一键换内容或换回复目标会拒绝。另对同账号、同帖、同回复目标、一分钟内相同内容去重。评论及举报各每账号每分钟最多 5 次新提交，使用数据库记录限频，不依赖单实例内存。公开输出的评论内容是纯文本，后续前台必须通过 React 文本节点渲染，不能使用 `innerHTML`。

### 管理接口（全部要求 admin）

| 方法与路径 | 说明 |
| --- | --- |
| `POST /admin/post/list/page` | 公开列表筛选项加 `status`，按草稿信息筛选；包含版本号及 `hasUnpublishedChanges` |
| `GET /admin/post/get?id=...` | 返回状态、版本号、`draft` 和 `published` 两份内容及标签 ID |
| `POST /admin/post/save` | `{id?,version?,title,summary,coverUrl,categoryId?,tagIds,markdown,commentsEnabled}`；新建省略 ID/version；编辑必须传最新 version；返回后台详情 |
| `POST /admin/post/publish`、`/offline`、`/delete` | `{id,version}`；发布要求正文及主分类，删除为逻辑删除 |
| `POST /admin/post/announcement` | `{id,version}`；以线上版本生成公告草稿，返回公告字符串 ID |
| `GET /admin/taxonomy/category`、`/tag` | 管理完整分类/标签列表 |
| `POST /admin/taxonomy/category/save`、`/tag/save` | `{id?,name,description?,sort,enabled}` |
| `POST /admin/taxonomy/category/delete`、`/tag/delete` | `{id}`；被任意保留版本引用时拒绝删除，可停用 |
| `POST /admin/comment/list/page` | 分页，支持 `postId`、`userId`、`keyword`、`hidden`，包含被隐藏/已下线帖子的评论及主留言隐藏状态 |
| `POST /admin/comment/moderate` | `{id,hidden}`，设置评论显示状态 |
| `POST /admin/report/list/page` | 分页，支持 `postId`、`status:pending或resolved` |
| `POST /admin/report/resolve` | `{id,resolution}`；记录处理说明、管理员和时间 |

官方回复使用同一个 `/comment/add`，服务端根据登录角色决定官方标记。任何客户端提供的作者 ID、点赞数或官方标记均不作为写入身份来源。

现有 `/api/announcement` 和 `/api/news` 继续表示系统公告，不改作帖子接口。公告返回新增 `targetType:"community_post"` 与字符串 `targetId`（无关联时为空），由用户前台后续决定实际路由。旧公告的公开范围、弹窗开关和读/关闭记录保持不变。

## Markdown 媒体约定

保留原始 Markdown（最多 200000 字符），不转换保存为 HTML。标题、列表、链接、图片按 CommonMark；不执行原始 HTML。安全预览实现见后台 `CommunityMarkdown` 组件，依据 [react-markdown 官方说明](https://github.com/remarkjs/react-markdown)。只允许 HTTPS 媒体、HTTPS 外链、站内绝对路径和锚点，不支持任意 iframe 或脚本。

图片：`![图片说明](https://example.com/image.png)`。视频使用以下块，内容只能是一条 HTTPS 视频 URL，上传能力沿用 `blog_image` / `blog_video`：

````markdown
```video
https://example.com/demo.mp4
```
````

视频使用 `controls`、`preload="metadata"`，不自动播放。图片和视频上传沿用现有文件类型、大小及 OSS 权限规则。

## 验证与发布

后台入口加载 Ant Design 官方 `@ant-design/v5-patch-for-react-19`，修复当前 React 19 下静态消息和确认弹窗无法显示的问题；见 [官方补丁](https://github.com/ant-design/v5-patch-for-react-19)。

```powershell
mvn '-Dtest=CommunityServiceTest,NewsServiceTest,AnnouncementNewsValidationTest,UserMembershipQueryTest' test
mvn -DskipTests package
cd web-admin
npm run build
```

`CommunityServiceTest` 使用隔离 H2 MySQL 模式数据库及真实事务代理，覆盖版本隔离、分类标签、排序计数、并发重试、评论关系、限频、举报、公告快照及 HTTP 权限。浏览器检查脚本为 `scripts/community_admin_qa.cjs`，需要 Playwright；仅访问本地管理后台产物及模拟 API，不访问用户前台或写入生产内容。

增量迁移 `sql/community.sql` 新建 9 张 community 表并向公告添加两个可空关联字段。先备份并执行一次迁移，再替换后端，验证新接口后更新管理后台。无种子新闻、分类、评论或点赞。回滚恢复后端 JAR 和后台静态文件，保留新增表和字段，不恢复数据库内容以免覆盖后续用户操作。
