# OwnAI MCP Server (智能设计与解构助手)

通过 MCP (Model Context Protocol) 协议，让 Cursor、Claude Desktop 等 AI 客户端直接连接您的 OwnAI 设计资产库。

## ✨ 核心能力

1. **🎨 检索您的个人解构收藏**：直接调用工作台解构收藏的切片代码、提示词、图标与媒体文件。
2. **🧩 平台设计作品库检索**：检索高质量前端设计作品与解构规范，辅助 AI 编写前端页面。
3. **⚡ 全自动化网页一键授权**：无需手动输入或复制 API Key，首次启动自动调起浏览器完成授权。
4. **👑 会员权益绑定**：面向月度、年度、永久付费会员提供，支持实时有效期验证。

---

## 🚀 接入指南

### 1. 在 Cursor 中配置

打开 Cursor `Settings` -> `Features` -> `MCP` -> 点击 `+ Add New MCP Server`：

* **Name**: `ownai-design`
* **Type**: `command`
* **Command**:
  ```bash
  node E:/JAVA_project/springboot-init-master/mcp-bridge/bin/index.js
  ```
  *(若已发布为全局包，可直接输入 `npx -y @ownai/mcp-server`)*

---

### 2. 在 Claude Desktop 中配置

打开 Claude Desktop 配置文件：
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

添加如下配置：

```json
{
  "mcpServers": {
    "ownai-design": {
      "command": "node",
      "args": ["E:/JAVA_project/springboot-init-master/mcp-bridge/bin/index.js"]
    }
  }
}
```

---

### 3. 一键授权使用

1. 保存配置后，启动 Cursor 或 Claude Desktop；
2. 浏览器会自动弹出 OwnAI 授权页面；
3. 登录并点击 **【确认授权给 Cursor / Claude Desktop】**；
4. 页面提示“授权成功”后，返回 AI 客户端即可直接开始对话！

#### 对话示例：
* *"帮我查看我在 OwnAI 收藏的所有状态栏组件切片代码"*
* *"搜索 OwnAI 平台关于登录页的设计作品并提供解构参考"*
* *"查询最新的 Claude 质感提示词模板"*
