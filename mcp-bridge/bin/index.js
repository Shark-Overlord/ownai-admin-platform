#!/usr/bin/env node

/**
 * OwnAI MCP Server Stdio Bridge
 *
 * 1. 启动时检查本地是否已保存授权 Token (~/.ownai/mcp-auth.json)
 * 2. 若无 Token，自动启动本地临时端口并调起浏览器打开授权页 (/mcp/auth)
 * 3. 用户在网页端点击【确认授权】后，本地捕获 Token 并保存
 * 4. 建立与 OwnAI 后端 SSE/HTTP 端点的双向通道，将 JSON-RPC 消息透明转发给 Cursor / Claude Desktop
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const readline = require("readline");

// 配置项（生产环境默认指向线上，本地可通过环境变量覆盖）
const API_BASE_URL = process.env.OWNAI_API_URL || "https://ownai.icu/api";
const WEB_BASE_URL = process.env.OWNAI_WEB_URL || "https://ownai.icu";
const CONFIG_DIR = path.join(os.homedir(), ".ownai");
const CONFIG_FILE = path.join(CONFIG_DIR, "mcp-auth.json");

// 确保目录存在
if (!fs.existsSync(CONFIG_DIR)) {
  try {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  } catch (_) {}
}

function log(msg) {
  // 注意：MCP Stdio 协议占用 stdout，所有调试日志必须输出到 stderr
  process.stderr.write(`[OwnAI-MCP] ${msg}\n`);
}

function loadSavedToken() {
  if (process.env.OWNAI_MCP_TOKEN) {
    return process.env.OWNAI_MCP_TOKEN.trim();
  }
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
      if (data && data.token) {
        return data.token.trim();
      }
    } catch (_) {}
  }
  return null;
}

function saveToken(token) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token, savedAt: new Date().toISOString() }, null, 2));
    log(`授权凭证已安全保存在: ${CONFIG_FILE}`);
  } catch (err) {
    log(`保存凭证失败: ${err.message}`);
  }
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd = "";
  if (platform === "win32") {
    cmd = `start "" "${url}"`;
  } else if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd, (err) => {
    if (err) {
      log(`无法自动打开浏览器，请手动复制以下链接到浏览器完成授权:\n${url}`);
    }
  });
}

/**
 * 启动临时本地 HTTP 回调服务，拉起网页一键授权
 */
function requestBrowserAuth() {
  return new Promise((resolve, reject) => {
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, `http://127.0.0.1`);

      if (reqUrl.pathname === "/callback") {
        const token = reqUrl.searchParams.get("token");
        const returnedState = reqUrl.searchParams.get("state");

        // 设置 CORS 响应头
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
        res.setHeader("Content-Type", "text/html; charset=utf-8");

        if (token) {
          saveToken(token);
          res.writeHead(200);
          res.end(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>授权成功 - OwnAI</title>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1013; color: #f0f2f5; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { text-align: center; padding: 48px; background: #18191d; border-radius: 20px; border: 1px solid #282a30; max-width: 420px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
                h2 { margin: 0 0 12px 0; color: #34d399; font-size: 24px; }
                p { margin: 0; color: #9ca3af; font-size: 14px; line-height: 1.6; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>🎉 授权成功！</h2>
                <p>OwnAI MCP 凭证已就绪，您可以关闭本标签页，返回 Cursor / Claude Desktop 继续使用 AI 智能助手。</p>
              </div>
            </body>
            </html>
          `);

          // 稍后关闭临时监听服务
          setTimeout(() => {
            server.close();
            resolve(token);
          }, 500);
        } else {
          res.writeHead(400);
          res.end("授权失败：未收到有效的 Token");
        }
      } else {
        res.writeHead(404);
        res.end("Not Found");
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      const authUrl = `${WEB_BASE_URL}/mcp/auth?port=${port}&state=${state}&client=${encodeURIComponent("Cursor / Claude Desktop")}`;
      log(`正在打开浏览器授权页面: ${authUrl}`);
      openBrowser(authUrl);
    });

    server.on("error", (err) => {
      reject(err);
    });
  });
}

let currentMessageEndpoint = null;
let currentToken = null;
const pendingMessages = [];
let isRlSetup = false;
let currentSseReq = null;

// 追踪客户端正在等待响应的请求 ID 与超时定时器
const pendingRequests = new Map();
const REQUEST_TIMEOUT_MS = 20000; // 20秒硬超时快速失败

function trackRequest(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.id !== undefined && parsed.method) {
      const id = parsed.id;
      const timer = setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          const errPayload = {
            jsonrpc: "2.0",
            id: id,
            error: {
              code: -32000,
              message: `OwnAI MCP 调用超时 (${REQUEST_TIMEOUT_MS / 1000}s)，会话可能已断开或在自动恢复中，请重试`
            }
          };
          process.stdout.write(JSON.stringify(errPayload) + "\n");
          log(`请求 [id: ${id}, method: ${parsed.method}] 超时，已向客户端返回快速失败`);
        }
      }, REQUEST_TIMEOUT_MS);

      pendingRequests.set(id, { timer, method: parsed.method });
    }
  } catch (_) {}
}

function resolveRequest(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.id !== undefined && pendingRequests.has(parsed.id)) {
      const item = pendingRequests.get(parsed.id);
      clearTimeout(item.timer);
      pendingRequests.delete(parsed.id);
    }
  } catch (_) {}
}

function failAllPendingRequests(reason) {
  for (const [id, item] of pendingRequests.entries()) {
    clearTimeout(item.timer);
    const errPayload = {
      jsonrpc: "2.0",
      id: id,
      error: {
        code: -32000,
        message: `OwnAI MCP 请求异常: ${reason}`
      }
    };
    process.stdout.write(JSON.stringify(errPayload) + "\n");
    log(`已快速失败挂起请求 [id: ${id}]: ${reason}`);
  }
  pendingRequests.clear();
}

function flushPendingMessages() {
  if (!currentMessageEndpoint || !currentToken) return;
  while (pendingMessages.length > 0) {
    const msg = pendingMessages.shift();
    sendJsonRpcMessage(currentMessageEndpoint, currentToken, msg);
  }
}

function setupStdinHandler() {
  if (isRlSetup) return;
  isRlSetup = true;

  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  });

  rl.on("line", (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    if (!currentMessageEndpoint || !currentToken) {
      log("已缓冲标准输入消息，待 MCP 通道就绪后自动发送…");
      pendingMessages.push(trimmed);
      return;
    }

    sendJsonRpcMessage(currentMessageEndpoint, currentToken, trimmed);
  });
}

/**
 * 建立与后端的 SSE 连接并桥接标准输入输出
 */
async function startMcpBridge(token) {
  log("正在连接 OwnAI 后端 MCP 服务…");

  const sseUrl = `${API_BASE_URL}/sse`;

  currentToken = token;
  currentMessageEndpoint = null;

  // 使用原生 http/https 模块建立 SSE 长连接
  const urlObj = new URL(sseUrl);
  const clientMod = urlObj.protocol === "https:" ? require("https") : require("http");

  const req = clientMod.request(
    {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${token}`,
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    },
    (res) => {
      if (res.statusCode === 401 || res.statusCode === 403) {
        log("凭证已过期或会员无效，清除旧 Token 并重新唤起授权…");
        try { fs.unlinkSync(CONFIG_FILE); } catch (_) {}
        requestBrowserAuth().then(startMcpBridge);
        return;
      }

      if (res.statusCode !== 200) {
        log(`连接 MCP SSE 失败，HTTP 状态码: ${res.statusCode}`);
        return;
      }

      log("SSE 链路已连接，就绪！");

      let buffer = "";
      res.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // 保留未闭合行

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("event:")) {
            // event: endpoint 等
          } else if (trimmed.startsWith("data:")) {
            const dataStr = trimmed.replace(/^data:\s*/, "");
            if (dataStr.startsWith("/") || dataStr.startsWith("http")) {
              // 收到 message 发送端点
              currentMessageEndpoint = dataStr.startsWith("http")
                ? dataStr
                : `${urlObj.protocol}//${urlObj.host}${dataStr.startsWith("/api") ? "" : "/api"}${dataStr}`;
              log(`已获取 MCP Message 端点: ${currentMessageEndpoint}`);
              flushPendingMessages();
            } else {
              // 收到 JSON-RPC 消息包，推给 stdout 并闭环已完成请求
              resolveRequest(dataStr);
              process.stdout.write(dataStr + "\n");
            }
          }
        }
      });

      res.on("end", () => {
        log("SSE 连接断开，准备重连…");
        currentMessageEndpoint = null;
        currentSseReq = null;
        setTimeout(() => startMcpBridge(token), 2000);
      });
    }
  );

  req.on("error", (err) => {
    log(`SSE 连接出错: ${err.message}，2秒后重连…`);
    currentMessageEndpoint = null;
    currentSseReq = null;
    setTimeout(() => startMcpBridge(token), 2000);
  });

  currentSseReq = req;
  req.end();
  setupStdinHandler();
}

function sendJsonRpcMessage(endpointUrl, token, jsonStr) {
  trackRequest(jsonStr);

  let parsedId = null;
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.id !== undefined) {
      parsedId = parsed.id;
    }
  } catch (_) {}

  const urlObj = new URL(endpointUrl);
  const clientMod = urlObj.protocol === "https:" ? require("https") : require("http");

  const postData = Buffer.from(jsonStr, "utf-8");
  const req = clientMod.request(
    {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": postData.length,
        Authorization: `Bearer ${token}`,
      },
      timeout: 15000,
    },
    (res) => {
      let body = "";
      res.on("data", (d) => { body += d; });
      res.on("end", () => {
        // 如果后端返回 400 或 404，说明 SessionId 已过期失效（例如后端刚重启）
        if (res.statusCode === 400 || res.statusCode === 404) {
          log(`检测到 MCP 会话已失效 (HTTP ${res.statusCode})，触发自动通道重建…`);
          currentMessageEndpoint = null;
          failAllPendingRequests("MCP 会话已失效，正在自动恢复连接，请重试");
          if (currentSseReq) {
            try { currentSseReq.destroy(); } catch (_) {}
          }
          return;
        }

        if (body.trim()) {
          resolveRequest(body.trim());
          process.stdout.write(body.trim() + "\n");
        }
      });
    }
  );

  req.on("timeout", () => {
    req.destroy(new Error("POST 请求超时 (15s)"));
  });

  req.on("error", (err) => {
    log(`发送消息失败: ${err.message}`);
    if (parsedId !== null && pendingRequests.has(parsedId)) {
      const item = pendingRequests.get(parsedId);
      clearTimeout(item.timer);
      pendingRequests.delete(parsedId);
      const errPayload = {
        jsonrpc: "2.0",
        id: parsedId,
        error: {
          code: -32000,
          message: `网络传输错误: ${err.message}`
        }
      };
      process.stdout.write(JSON.stringify(errPayload) + "\n");
    }
  });

  req.write(postData);
  req.end();
}

// 主入口
async function main() {
  let token = loadSavedToken();
  if (!token) {
    log("未检测到有效授权凭证，启动浏览器一键授权流程…");
    token = await requestBrowserAuth();
  } else {
    log("已加载本地已保存凭证");
  }

  await startMcpBridge(token);
}

main().catch((err) => {
  log(`致命错误: ${err.message}`);
  process.exit(1);
});
