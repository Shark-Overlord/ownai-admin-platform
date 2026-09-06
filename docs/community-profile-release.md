# 社区个人中心发布说明

## 当前交付

- 前台接入新闻与帖子、评论/回复/点赞、我的评论和我赞过的；返回列表保留筛选和阅读位置，进入原讨论可定位后续分页中的评论。
- 公告与帖子使用相同的信息流样式，重要公告以居中模态框展示；公告作者使用真实昵称及头像。
- 个人资料支持本地生成 DiceBear 头像、编辑保存/取消、签到面板；保留既有会员和订单能力。
- 管理后台可置顶已发布帖子；最新和最受欢迎列表均优先显示置顶内容。前台没有置顶管理按钮。
- 帖子预览从 Markdown 提取文字、图片或 `video` 代码块中的 HTTPS 视频，不再填写独立封面。
- 公告链接直接写入 Markdown；现有历史按钮链接仍保留，定时等非日常字段收进“更多设置”。
- 首页导航合并为“提示词库”下拉项，桌面悬停展开；教程和个人中心入口改为“VibeCoding教程”“我的社区”。修复浅色按钮文字对比度，支持移动端和深浅主题。

“我的下载”依照后续产品意见取消。早期方案中的回复通知/互动未读数、版本化关联资源卡片尚未实现；当前“我的互动”提供我的评论和我赞过的两个列表。

## 接口增量

以下路径均使用 `/api/community` 前缀：

| 方法与路径 | 说明 |
| --- | --- |
| `POST /me/comments/list/page` | 当前登录用户可见的评论和回复，分页 |
| `POST /me/likes/list/page` | 当前登录用户赞过的公开帖子，分页 |
| `GET /comment/context?postId=...&id=...` | 返回可见目标评论和主楼；拒绝跨帖、隐藏及下线内容 |
| `POST /admin/post/pin`、`/admin/post/unpin` | 管理员传 `{id,version}`，乐观锁控制置顶 |

帖子列表/详情增加 `authorName`、`authorAvatar`、`official`、`pinned`、`excerpt`、`previewMediaType`、`previewMediaUrl`；公告 VO 增加作者字段。所有业务 ID 在前台保持字符串。

## 发布顺序

1. 从已核查的开发分支提交建立干净发布工作树。不要复制 `.env.local`、本地预览配置、测试账号或演示数据。
2. 运行前台和 `web-admin` 的 `npm run build`，运行后端社区/公告及资源权益回归测试，构建 JAR。
3. 备份生产 JAR、两个站点的静态文件和相关数据库表。
4. 对现有数据库执行 `sql/community_profile_upgrade.sql`，只增加 `pinned`、`pinnedAt` 和索引。不要重跑一次性建表脚本 `sql/community.sql`。
5. 发布后端并检查接口，再发布管理后台和用户前台。先上传哈希资源，再原子替换各自 `index.html`，保留旧资源以兼容打开中的页面。
6. 核对线上文件摘要、公开读取、未登录权限边界和前台页面。

回退恢复备份的 JAR 和两个站点入口；保留新增字段及上线后的真实业务数据，不整体覆盖数据库。生产服务为 `springboot-init`，JAR 为 `/opt/springboot-init/app.jar`，管理后台目录为 `/www/wwwroot/springboot-init-admin`，用户前台目录为 `/www/wwwroot/ownai`。
