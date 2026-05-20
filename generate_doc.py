#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import json

with open("test_results.json", "r", encoding="utf-8") as f:
    results = json.load(f)

# 模块顺序
module_order = [
    ("user", "用户模块"),
    ("category", "分类模块"),
    ("tag", "标签模块"),
    ("artwork", "作品模块"),
    ("order", "作品订单模块"),
    ("member", "会员模块"),
    ("point", "积分模块"),
    ("operation-log", "操作日志模块"),
]

passed = sum(1 for r in results if r["conclusion"] == "通过")
failed = sum(1 for r in results if r["conclusion"] == "失败")
blocked = sum(1 for r in results if r["conclusion"] == "阻塞")

lines = []
lines.append("---")
lines.append("")
lines.append("## 接口测试记录")
lines.append("")
lines.append("> 测试时间：2026-04-16")
lines.append("> 测试环境：本地 Spring Boot + MySQL")
lines.append("> 服务前缀：`http://localhost:8011/api`")
lines.append("")

for module_key, module_name in module_order:
    module_results = [r for r in results if r["module"] == module_key]
    if not module_results:
        continue
    lines.append(f"### {module_name}")
    lines.append("")
    for idx, r in enumerate(module_results, 1):
        lines.append(f"#### {module_key}-{idx:02d} {r['method']} {r['path']}")
        lines.append("")
        lines.append("- **接口信息**：")
        lines.append(f"  - 方法：`{r['method']}`")
        lines.append(f"  - 路径：`{r['path']}`")
        lines.append(f"  - 鉴权类型：`{r['auth_type']}`")
        lines.append("- **前置数据**：")
        lines.append(f"  - {r['precondition']}")
        lines.append("- **请求示例**：")
        if r['request_body'] == "无":
            lines.append("  - 无")
        else:
            lines.append(f"  ```json")
            try:
                body_json = json.dumps(json.loads(r['request_body']), ensure_ascii=False, indent=2)
                for line in body_json.split("\n"):
                    lines.append(f"  {line}")
            except:
                lines.append(f"  {r['request_body']}")
            lines.append(f"  ```")
        lines.append("- **响应摘要**：")
        try:
            resp = json.loads(r['response'])
            code = resp.get("code", "N/A")
            lines.append(f"  - `code`：{code}")
            data = resp.get("data")
            if data is not None:
                if isinstance(data, dict):
                    keys = ", ".join([f"`{k}`" for k in list(data.keys())[:5]])
                    lines.append(f"  - 关键 `data` 字段：{keys}")
                elif isinstance(data, list):
                    lines.append(f"  - `data`：列表，共 {len(data)} 条")
                elif isinstance(data, bool):
                    lines.append(f"  - `data`：{data}")
                else:
                    lines.append(f"  - `data`：{data}")
            message = resp.get("message", "")
            if message:
                lines.append(f"  - `message`：{message}")
        except:
            lines.append(f"  - 原始响应：{r['response'][:200]}")
        lines.append("- **测试结论**：")
        emoji = "✅" if r['conclusion'] == "通过" else "❌"
        lines.append(f"  - {emoji} {r['conclusion']}")
        if r.get("fail_reason"):
            lines.append(f"  - 失败原因：{r['fail_reason']}")
        lines.append("")

# 未纳入实测接口
lines.append("---")
lines.append("")
lines.append("## 未纳入实测接口清单（外部依赖）")
lines.append("")
lines.append("以下 5 个接口因依赖外部第三方服务，本轮仅做标记，未做真实联调：")
lines.append("")
lines.append("| 序号 | 模块 | 方法 | 路径 | 未联调原因 |")
lines.append("| :--- | :--- | :--- | :--- | :--- |")
lines.append("| 1 | user | GET | `/user/login/wx_open` | 依赖微信开放平台 OAuth 真实 code |")
lines.append("| 2 | file | POST | `/file/upload` | 依赖腾讯云 COS 真实配置与密钥 |")
lines.append("| 3 | wxmp | POST | `/` | 依赖微信公众号服务器真实推送与签名验证 |")
lines.append("| 4 | wxmp | GET | `/` | 依赖微信公众号服务器真实签名验证 |")
lines.append("| 5 | wxmp | GET | `/setMenu` | 依赖微信公众号真实 access_token |")
lines.append("")

# 后续联调条件
lines.append("---")
lines.append("")
lines.append("## 后续联调条件")
lines.append("")
lines.append("1. **微信登录/回调**：需配置有效的 `wx.open.appId`、`wx.open.appSecret`，并获取真实微信授权 code。")
lines.append("2. **COS 文件上传**：需配置有效的 `cos.client.secretId`、`secretKey`、`region`、`bucket`，并确保网络可访问。")
lines.append("3. **微信公众号**：需配置有效的 `wx.mp.appId`、`secret`、`token`、`aesKey`，并部署到可被微信服务器访问的公网地址。")
lines.append("4. **支付网关**：当前已使用 `mock` 渠道完成本地闭环；如需真实支付，需接入对应支付 SDK 并替换回调地址。")
lines.append("")

# 统计汇总
lines.append("---")
lines.append("")
lines.append("## 测试统计汇总")
lines.append("")
lines.append("| 指标 | 数量 | 说明 |")
lines.append("| :--- | :--- | :--- |")
lines.append(f"| 总接口数 | 54 | 全量接口统计 |")
lines.append(f"| 纳入实测数 | 49 | 本地可闭环接口 |")
lines.append(f"| 通过数 | {passed} | 记录条数（含同接口多场景） |")
lines.append(f"| 失败数 | {failed} | 需关注修复 |")
lines.append(f"| 阻塞数 | {blocked} | 环境/数据阻塞 |")
lines.append(f"| 未实测（外部依赖） | 5 | 待外部条件就绪后补测 |")
lines.append("")
lines.append("**验收结论**：49 个本地闭环接口均已留下可复现记录，文档可直接用于二次复测。")
lines.append("")

output = "\n".join(lines)
with open("doc/联调说明.md", "a", encoding="utf-8") as f:
    f.write(output)

print("文档已追加到 doc/联调说明.md")
