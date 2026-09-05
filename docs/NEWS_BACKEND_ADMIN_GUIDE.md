# 网站动态：后台与后端交付说明

本期仅实现 Spring Boot 后端和 `web-admin`。Design-Everything 前台暂缓；没有新闻页面或自动弹窗接入上线，也没有发送邮件。

## 后台使用

1. 公告管理 → 新增公告，填写标题、摘要和 Markdown 正文。
2. 默认“公开展示”开启、“弹窗提醒”关闭；开启弹窗必须填写摘要。
3. 用“上传并插入图片”复用现有图片存储，支持 PNG/JPEG/WebP/GIF，管理界面限制 10 MB。
4. 可选填写按钮文字和站内路径，例如 `去体验` + `/tutorials`；两项必须同时填写。
5. 查看“详情预览”或“弹窗预览”，保存为草稿，再从列表点击发布。
6. 填写未来发布时间时，发布后等待该时间才对外可见；未填过期时间则长期有效。编辑时可清空日期。
7. 已发布记录保存后更新内容，但不会清除用户的弹窗关闭记录。下线或过期后公开接口停止返回。

现有前台没有接入本期公开新闻与弹窗功能；开关只是准备好后端配置。旧前台已登录公告入口仍沿用原有逻辑，已发布公告仍可能在原公告入口展示。

## 接口合同

以下路径包含 `/api` 前缀。公共接口不要求登录，关闭同步接口必须使用有效 JWT。普通用户和会员使用相同的公开新闻接口。

| 接口 | 请求 | 返回 |
| --- | --- | --- |
| `POST /api/news/list/page` | `{ "current": 1, "pageSize": 10 }`，pageSize 为 1–50 | 分页公开新闻；不返回完整正文 |
| `GET /api/news/get?id=...` | 十进制字符串 ID | 完整新闻，或不存在业务错误 |
| `POST /api/news/popup/candidate` | `{ "ids": ["已关闭的ID"] }` | 优先级最高的可展示新闻；没有则 `data: null` |
| `POST /api/news/popup/dismiss` | `{ "ids": ["公告ID"] }`，要求登录 | 幂等保存当前账号关闭记录，`data: true` |

分页的 `total`、`size`、`current`、`pages` 沿用现有全局 Long 序列化，JSON 值为十进制字符串；客户端仅将分页计数转换为 Number，ID 不转换。

公开新闻结构：`id`（字符串）、`title`、`summary`、`content`（仅详情）、`type`、`actionLabel`、`actionPath`、`publishTime`。不返回创建人、后台状态、会员或账号数据。

公开筛选条件统一为：未删除、`publicVisible=true`、状态 `published`、发布时间未设置或已到、过期时间未设置或未到。弹窗候选额外要求 `popupEnabled=true`，按 `priority DESC, publishTime DESC, id DESC` 排序。请求排除项和当前登录账号的关闭项均不返回。

`ids` 最多 500 条、只接受正整数编号；建议同步时每批 100 条。关闭同步忽略不存在或非公开公告，允许同步已下线/过期的公开公告；不会写 `announcement_read`。唯一键 `(announcementId,userId)` 保证重复调用或并发关闭不会创建重复记录。

管理后台现有新增/编辑 DTO 增加：`publicVisible`、`summary`（最多 300 字）、`actionLabel`（最多 30 字）、`actionPath`（最多 500 字）、`popupEnabled`。公告新增结果和后台列表 ID 为字符串；旧前台的公告列表/详情保持原有 JSON 格式（现有 JsonConfig 已将 Long ID 序列化为字符串）。旧客户端省略新闻字段时，新增默认私有、不弹窗，编辑保留既有新闻配置。

按钮仅接受 `/` 开头的本站路径，拒绝外站、协议相对路径、反斜杠和编码后的危险路径。Markdown 预览禁用原始 HTML，并过滤不安全 URL；预览中的链接不会跳出编辑页面。

## 前台后续接入要求（本期未实施）

- 前台负责公开新闻路由、导航入口和移动端呈现。
- 每标签页最多自动弹出一条；登录、注册、资料、购买及支付结果页不得自动弹出。
- 游客本地保存关闭 ID，登录后调用关闭同步接口，再查询候选。
- 关闭摘要不等于阅读正文；阅读详情后，登录用户可调用旧的 `/api/announcement/read`，请求为 `{ "id": "..." }`。
- 所有新接口 ID 使用字符串，不做 `Number(id)` 转换。账户身份仍由 JWT 决定，不能在请求体指定 userId。
- 公共接口错误应静默停止自动弹窗，不能影响原有浏览或支付。

## 迁移与验证

先备份 `announcement` 和 `announcement_read`，执行一次 `sql/news_public_popup.sql`，再部署后端和管理后台。

迁移新增五个公告字段及独立的 `announcement_popup_dismissal` 表。历史公告默认 `publicVisible=0`、`popupEnabled=0`；不修改旧公告正文、状态、阅读记录或会员数据。

PowerShell 本地验证：

```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk1.8.0_202'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
.\mvnw.cmd -B '-Dtest=NewsServiceTest,AnnouncementNewsValidationTest,UserMembershipQueryTest' package
cd web-admin
npm.cmd run build
```

浏览器验收使用隔离的模拟 API，验证后台编辑、图片插入、双预览、保存和发布/下线，不发送真实公告。脚本保存在 `artifacts/news-qa/admin-browser-tests.cjs`，使用该目录中的 Playwright 和本机 Chrome。

回滚应用时保留新增字段和关闭表，恢复旧 jar 与后台静态入口即可；不反向删除字段或恢复整库，以免覆盖回滚前用户产生的数据。
