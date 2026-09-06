# 作品积分永久解锁交付说明

## 实现与分支

后端和管理后台：`E:\JAVA_project\springboot-init-master`。
用户前台：`E:\DesginEverything\Design-Everything`。
两个仓库均从已与远端同步的 `develop` 新建 `codex/artwork-points-unlock` 后开发。保留了原有未提交文件。开发验收完成后，经用户确认进入提交、合并 main 和生产发布阶段；部署结果以对应 release 记录为准。

新作品默认 100 积分，管理员可以调整。免费作品不收费；有效会员直接访问；普通用户确认扣分后获得整条作品永久访问权，包括提示词、代码和源码 ZIP，以及同一作品 ID 的后续更新。下线或删除期间拒绝读取，重新上线不需要重复兑换。

## 接口与数据契约

- `GET /api/artwork/detail?id=<字符串ID>`：新增公开详情接口。返回 `pointsPrice`、`canAccessPrompt`、`permanentlyUnlocked`、`hasSourceCode`、`accessReason`；未授权时 `promptContent=null`，所有用户的公开详情均不返回 `sourceZipUrl`。设置 `Cache-Control: private, no-store`。
- `GET /api/artwork/get/vo?id=...`：保留原先返回提示词字符串的契约，授权不足时返回业务码 `40101`。旧前台详情读取函数误用了此接口，本次改为 `/artwork/detail`。
- 列表、首页概览和收藏列表增加 `pointsPrice`、`permanentlyUnlocked`。列表一次批量查询当前账号的永久权限。
- `POST /api/order/create`：请求 `{ "artworkId": "9007199254740993", "orderType": "points", "expectedPointsPrice": 100 }`。价格以服务端为准；前台提交确认时看到的价格，发生变化时要求重新确认。订单与作品 ID 通过现有 Jackson Long 字符串序列化配置返回。
- 首次兑换返回已完成订单；重复请求返回同一已完成兑换订单。免费作品或有效会员无需购买时成功返回 `data=null`，不创建订单、不扣分。前台以重新查询详情的结果为准。
- `GET /api/point/me` 从数据库刷新余额；兑换成功后同步本地账号余额，并通过事件更新列表和已打开的详情。
- `/api/artwork/source/download` 继续代理源码下载，复用同一权限判断。直接访问下线、删除、未解锁作品不会放行。

扣分事务先获取账号数据库行锁，再读取作品、历史订单、会员状态和价格；订单、积分流水、授权一起提交或回滚。保留原账号与作品唯一约束。真实完成的积分订单必须有匹配的 `redeem_consume` 负数流水；缺失授权行的旧真实积分订单也能识别，并在重复请求或迁移时补齐授权。

作品现金支付没有验签集成，原模拟支付与未验证回调可能直接生成授权。因此本次关闭 `/api/order/pay/mock`、`/api/order/pay/callback`，停止创建新的作品现金订单，不把旧模拟支付视为永久权益。会员支付宝支付使用独立接口，不受影响。

## 用户前台

共享兑换弹窗显示标题、价格、余额和解锁范围；余额不足展示差额并复用现有签到按钮。支持关闭、Esc、焦点返回、深浅主题、移动端。用户登录回跳会保留作品 ID，回跳只展示确认弹窗，不自动扣分。

所有扣分均要求明确确认。请求发送后发生断网或超时，先查询权限；仍无法确认时提供重新查询/重试，不盲目再扣。后端同账号幂等保证重试不会多扣。复制、下载需要用户再次点击，相应失败不会重新兑换。

本功能只针对 `artwork`。独立的图片 Prompt 资产、视频背景、教程、插件、会员商品权限和签到奖励规则保持原状。

## 线上只读核查与迁移

2026-09-06 核查：606 条未删除作品，积分价格全部 0；真实积分订单 0 条；已完成现金作品订单 5 条，全部 `paymentChannel=mock` 且第三方订单号为 `MOCK-...`。数据库原积分价格默认值为 0。此为迁移前的只读基线。

准备了三个 SQL 文件：

1. `sql/artwork_points_unlock_audit.sql`：只读价格分布、订单类型、真实扣分与重复扣分统计。
2. `sql/artwork_points_unlock.sql`：创建原价格备份表和迁移标记，在事务中备份未删除作品的 ID/原价后统一设置为 100；数据库默认值改为 100，并补齐真实积分订单缺失的授权。重跑不会重新覆盖后续人工调整的作品价格。
3. `sql/artwork_points_unlock_rollback.sql`：仅恢复仍为迁移价格 100 的作品原价，避免覆盖后续人工调价；恢复原数据库默认值。保留订单、授权、积分流水和备份标记。

发布前再运行只读核查，以当时数量为准。备份部署 JAR、后台/前台构建目录和数据库，再从功能分支整理本次文件，合并到 develop/main 发布。部署顺序为兼容后端、执行价格迁移、管理后台、用户前台。先确认 `/artwork/detail` 可用、旧提示词接口兼容，再切换前台。

紧急回滚优先恢复前台和价格，同时保留兼容后端的授权判断及关闭模拟支付修复；恢复旧后端会暂时失去新授权识别能力，不应删除用户已获得的权益。

上线检查：游客受限详情无正文、普通用户可明确确认兑换、余额少 100、同一订单重复请求不扣分、再次复制/下载可用、会员访问不扣分。用独立测试账号完成，不自动发布作品或给真实用户扣分。

## 本地验证

最终结果：68 项后端测试通过，管理后台和用户前台构建通过，11 个隔离浏览器场景通过；两个仓库 `git diff --check` 通过。这些结果来自发布前验收，生产迁移结果单独记录。

后端（仓库根目录）：

```powershell
mvn -q '-Dtest=ArtworkPointsIntegrationTest,ArtworkAccessTest,ArtworkControllerTest,OrderControllerTest,OwnaiDesignFileControllerTest,CommunityServiceTest,NewsServiceTest,AnnouncementNewsValidationTest,UserMembershipQueryTest,AlipayMemberPaymentSettlementServiceTest,MemberServiceImplMembershipTest' test
```

后端集成测试使用隔离 H2 MySQL 模式，运行真实 MyBatis SQL、Spring 事务和数据库行锁；不连接生产数据库。包括 99/100/300 积分边界、8 路同作品并发、不同作品并发防透支、授权失败回滚、免费/会员免扣、过期/重新发布、单次批量查授权、历史流水校验和默认价格/编辑保留。

管理后台在 `web-admin` 运行 `npm run build`。用户前台运行 `npm run build`，浏览器验收：

```powershell
npm run dev -- --host 127.0.0.1 --port 5181 --strictPort
# 另一个终端，需要 Python Playwright 与 Chromium
python scripts/prompt_unlock_qa.py
```

浏览器测试拦截全部 API，使用假账号和隔离订单状态；截图与结果位于用户前台 `design-qa-assets/points-unlock/`。没有向生产接口提交兑换或修改积分。生产 MySQL 迁移和部署后的真实账号验证留到发布阶段。
