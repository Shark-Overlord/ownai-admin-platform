# 积分充值：配置、订单与验收

## 实现范围

- 前台项目套餐 `/pricing` 顶部增加充值卡片，支持整数份数、实时总额和到账积分。
- 后台「交易会员 → 积分管理」配置每份价格、每份积分、单笔上限和启用状态。初始值是 1.00 元、100 积分、最多 1000 份。
- 前台从 `GET /api/point/recharge-config` 读取配置，配置异常时禁止提交，不使用本地价格兜底。
- 管理接口 `POST /api/point/recharge-config/update` 沿用 `AuthCheck(admin)` 和操作日志，更新固定配置 ID 1。

## 复用现有支付系统

充值与会员订单均使用现有 `member_order` 存储；充值通过 `orderType=point_recharge`、`planType=points` 区分，新增 `rechargeQuantity` 保存购买份数。`orderAmount`、`amountMinor` 和 `pointsAmount` 保存下单时的总金额和积分快照。

调用现有 `POST /api/member/payment/create`，请求示例：

```json
{
  "planType": "points",
  "quantity": 3,
  "expectedUnitPrice": 1.00,
  "expectedPointsPerUnit": 100,
  "requestId": "client-generated-uuid"
}
```

服务端校验整数份数、配置状态、单笔上限及报价，以数据库单价计算订单金额。报价改变时拒绝此次购买，前台刷新配置，等待用户重新确认。重试同一请求使用已保存订单；同一请求 ID 不可改商品或份数。

继续支付、取消、签名通知、主动查单、支付回跳和超时关闭均复用现有支付宝接口。创建订单不会增加积分。核验支付状态和金额后，在订单行锁及 Spring 事务中同时完成订单、积分余额和积分流水更新。流水使用 `changeType=point_recharge`、`relatedType=member_order`、`relatedId=订单ID`，不授予会员权益。后台改价不改变已创建订单。

用户「我的社区 → 订单」、后台「交易会员 → 交易订单」均可查看充值记录；后台可按订单类型和商品类型筛选。充值订单不计入「今日会员订单」数量，仍计入交易金额及待处理订单。

## 数据库升级与发布顺序

1. 备份目标数据库，在已确认的目标库执行 `sql/migrations/point_recharge.sql`。
2. 该脚本新增充值配置表、初始化默认值并增加可空份数字段，可重复执行，不覆盖已有配置。
3. 部署后端，再部署后台和前台；在后台确认配置后做验收。
4. 需要暂停时关闭充值配置。已创建订单仍按快照支付和入账。已有充值订单未结清时，不可直接回退为不识别充值类型的旧后端；先停止新充值，处理完待支付订单再安排回退，保留订单及流水。

本次未对生产数据库执行迁移，未部署，未进行真实支付宝付款。

## 验证

后端：
```powershell
mvn -q '-Dtest=PointRechargeConfigServiceTest,PointRechargeSettlementIntegrationTest,AlipayMemberPaymentServiceImplTest,AlipayMemberPaymentSettlementServiceTest,MemberControllerTest,MemberServiceImplMembershipTest' test
```

H2/MySQL 模式使用真实 MyBatis、行锁及事务代理，覆盖并发重复回调仅入账一次、流水失败全部回滚及重试、错误金额与已关闭订单不得入账。单元测试覆盖动态价格、永久会员充值、无效份数、小数 JSON、过期报价、停用、上限、幂等请求复用以及现有会员开通。

前台仓库：`npm run build`；启动 Vite 5181 后执行 `python scripts/point_recharge_qa.py`。使用模拟接口验证 1280/390 宽度、深浅主题、1元100积分初始显示、改价、数量边界、支付表单、结果页和余额刷新。

后台：`cd web-admin; npm run build`；启动 Vite 5182 后从后端仓库执行 `python scripts/point_recharge_admin_qa.py`。模拟配置保存/刷新及充值订单列表展示。

所有浏览器支付请求均被拦截到测试收银台，没有真实扣款。支付宝线上验签、外网回调和真实资金入账仍需发布后的真实订单验收。
