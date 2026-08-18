# React + Vite 前台有效阅读统计改造提示词

请在当前 React + Vite 前台项目中实现教程文章“有效阅读”统计。先检查项目现有的请求封装、登录凭证、路由、文章详情页和站点 `visitorId` 生成逻辑，然后在保持现有 UI 风格和接口封装方式的前提下完成以下修改。

## 后端接口

文章详情：

```http
GET /api/blog/front/posts/{postId}
```

详情和文章列表新增：

```ts
readCount: string;          // 累计有效阅读次数
uniqueReaderCount: string;  // 累计独立读者数
```

有效阅读上报：

```http
POST /api/blog/front/posts/read
Content-Type: application/json

{
  "postId": "文章ID",
  "visitorId": "稳定的浏览器访客ID",
  "durationSeconds": 10
}
```

响应：

```ts
interface PostReadResult {
  counted: boolean;
  readCount: string;
  uniqueReaderCount: string;
}
```

`counted=false` 表示同一读者当天已经统计过，是正常的幂等成功。

## 实现要求

1. 复用站点流量统计已有的稳定 `visitorId`。如果项目还没有，则使用 `crypto.randomUUID()` 生成并保存到 `localStorage`；格式必须满足 `^[A-Za-z0-9_-]{16,128}$`，不要使用指纹识别、IP 或明文个人信息。
2. 只有文章详情接口成功返回正文后才启动计时。403、404、草稿预览和后台预览不能上报。
3. 只累计页面处于前台可见状态的时间：`document.visibilityState === 'visible'`。页面隐藏时暂停，重新可见后继续。
4. 累计可见阅读达到 10 秒后只上报一次。文章 ID 改变时取消旧计时并为新文章重新开始。
5. 请求必须沿用项目现有登录凭证方式（Cookie 项目使用 `credentials: 'include'`，Token 项目沿用 Authorization），让后端可以优先按登录用户去重。
6. React StrictMode 下 effect 可能执行两次，必须正确清理定时器；即使发生重复请求，后端也会按“读者 + 文章 + Asia/Shanghai 自然日”去重。
7. 不要在上报前乐观增加数字。请求成功后用响应中的 `readCount` 和 `uniqueReaderCount` 更新当前文章状态。
8. 网络失败最多静默重试一次；参数错误、无权限、内容下线不重试，不弹出干扰阅读的全局错误提示。
9. 新 UI 使用“有效阅读”或“阅读”展示 `readCount`；如需展示人数，使用“独立读者”展示 `uniqueReaderCount`。
10. 教程书和文章的 `popular` 排序参数保持不变，后端已经改为按有效阅读排序。

## 建议封装

新增可复用 Hook，例如：

```ts
useEffectiveArticleRead({
  postId,
  enabled: articleLoaded && canAccess,
  thresholdSeconds: 10,
});
```

Hook 负责可见时间累计、路由切换清理、单次上报和响应回写；页面组件只负责传入文章 ID 与加载状态。

## 验收

- 打开文章不足 10 秒离开：不发送上报。
- 可见阅读满 10 秒：只发送一次上报。
- 切到后台标签页 10 秒：后台时间不计入；返回后继续累计。
- 同一浏览器当天重复阅读同一文章：接口成功但 `counted=false`。
- 登录用户更换浏览器，当天重复阅读同一文章：仍按用户 ID 去重。
- 免费文章和有权限的会员文章可以统计；无权阅读的会员文章不能统计。
- 切换到另一篇文章后，旧计时器被清理，新文章独立计时。
- 页面显示 `readCount` 和需要的 `uniqueReaderCount`。
