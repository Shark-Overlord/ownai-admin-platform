# 访问取证与安全日志

## 目标

为 OwnAI 的滥用排查、反爬告警和依法维权保留最小必要访问证据。该方案不记录密码、JWT、Cookie、请求体或第三方支付敏感信息。

## 线上日志

| 站点 | 文件 | 内容 |
| --- | --- | --- |
| `de.ownai.icu` | `/www/wwwlogs/de-ownai-migration.evidence.log` | 前台站点访问证据 |
| `admin.ownai.icu` | `/www/wwwlogs/springboot-init-admin.evidence.log` | 后台和 API 访问证据 |

每条 JSON 日志含：北京时间（ISO-8601）、站点、客户端源 IP/端口、方法、无查询参数的路径、HTTP 状态、请求和上游耗时、来源页、User-Agent。

Nginx 直连公网时以 `$remote_addr` 为准。不要信任访问者自带的 `X-Forwarded-For`、`X-Real-IP` 等头；若日后接入 CDN，必须仅将 CDN 的官方出口网段列为可信代理后才可读取其真实客户端 IP 头。

## 留存规则

- 配置文件：`/etc/logrotate.d/ownai-evidence`
- 每日轮转，压缩保存 `180` 份，满足网络日志不少于六个月的留存目标。
- 新文件权限为 `0640 root:root`；仅具备服务器管理权限的人可读取。
- Nginx 配置文件：`/www/server/panel/vhost/nginx/0.ownai-evidence-log.conf`。

检查配置：

```bash
/www/server/nginx/sbin/nginx -t
logrotate -d /etc/logrotate.d/ownai-evidence
tail -f /www/wwwlogs/de-ownai-migration.evidence.log
```

## 后端关联

`operation_log.sourceIp` 用于把带有 `@OperationLog` 的后台或内容操作与可信客户端 IP 关联。匹配版本上线前需先执行：

```bash
mysql -u root -p my_db < sql/security_access_logging.sql
```

生产后端应绑定 `127.0.0.1:8011`，只允许本机 Nginx 转发。不要暴露 `8011` 到公网，否则攻击者可绕过 Nginx 限制与来源头校验。

## 发生事件时

1. 立即记录时间范围、涉及 URL、账号 ID、内容 ID、截图和 request ID（若有）。
2. 导出对应日志原件，不修改原文件：

   ```bash
   grep '"client_ip":"203.0.113.10"' /www/wwwlogs/*evidence.log > /root/ownai-evidence-incident.jsonl
   sha256sum /root/ownai-evidence-incident.jsonl > /root/ownai-evidence-incident.sha256
   ```

3. 连同内容发布时间、数据库操作日志和页面截图交给云厂商、律师或执法机关。IP 归属和实名信息只能由有权机关或相关服务提供者依规调取。
4. 不公开传播、曝光或尝试自行定位访问者身份。

## 隐私告知

隐私政策应明确写明：为安全防护、反爬和处理滥用行为处理 IP、账号标识、请求路径和设备浏览器信息；保存期限为至少六个月或法律规定期限；并提供联系渠道。实际文案应在上线前结合业务和法务意见确认。
