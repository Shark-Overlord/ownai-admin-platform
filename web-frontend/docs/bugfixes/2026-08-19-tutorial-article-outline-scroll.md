# 教程文章目录点击不跳转问题复盘

## 背景

教程文章详情页采用左侧教程书目录、中间正文、右侧本文目录的阅读布局。本文目录由正文 `contentHtml` 中的 `h2/h3` 标题自动生成，预期效果是点击右侧目录后，中间正文区域滚动到对应标题位置。

本次问题表现为：桌面端和移动端点击本文目录后，目录高亮可能变化，但正文没有跳转到对应段落。

## 期望交互

- 右侧主内容区内部拆成两个区域：
  - 左侧：文章正文滚动容器。
  - 右侧：本文目录滚动容器。
- 两个区域独立滚动，不依赖整个页面滚动。
- 点击右侧目录项时，只滚动左侧正文容器。
- 移动端目录仍使用抽屉，但关闭抽屉后也要滚动正文容器到对应标题。

## 根因

最初的实现是在文章正文渲染完成后，通过 DOM 查询找到 `h2/h3`，再运行时给标题写入 `id`：

```ts
const headings = Array.from(root.querySelectorAll<HTMLHeadingElement>("h2, h3"));
heading.id = id;
```

这个方案的问题是：正文是通过 `dangerouslySetInnerHTML` 渲染的，阅读数、收藏数、文章状态更新等操作都会触发 React 重新渲染。重新渲染时，React 会再次把后端返回的 `contentHtml` 写入 DOM，导致运行时追加的 `id`、锚点按钮等 DOM 修改被覆盖。

结果就是：

- 目录数据仍然存在，因为它已经写进 React state。
- 但正文真实 DOM 里的 `h2/h3` 已经没有 `id`。
- 点击目录时，滚动逻辑通过 `h2[id], h3[id]` 找不到目标节点。
- 所以表现为“点击了，但没有跳转”。

这也是这个问题反复修复仍不稳定的主要原因：只改滚动容器或 `scrollIntoView` 不够，必须先解决锚点稳定性。

## 修复方案

最终采用“渲染前增强 HTML”的方案：

1. 在前端渲染正文前，对后端返回的 `contentHtml` 做一次轻量结构处理。
2. 解析正文 HTML，找到 `h2/h3`。
3. 根据标题文本生成稳定 `id`，并直接写入最终要渲染的 HTML 字符串。
4. 同时生成本文目录数据。
5. `dangerouslySetInnerHTML` 渲染的是已经带有标题 `id` 的 HTML。
6. 后续 React 即使重新渲染，标题 `id` 仍然会存在。

核心思路：

```ts
const articleContent = useMemo(
  () => prepareTutorialArticleContent(post?.contentHtml),
  [post?.contentHtml],
);

<article
  ref={articleRef}
  dangerouslySetInnerHTML={{ __html: articleContent.html }}
/>
```

目录滚动时，不再滚动整个页面，而是只滚动正文容器：

```ts
const scroller = articleScrollRef.current;
const target = articleRef.current?.querySelector(`#${id}`);
scroller.scrollTo({ top: nextTop, behavior: "smooth" });
```

同时保留了一个兜底逻辑：如果某些异常情况下 `id` 仍没有命中，则按目录项生成时记录的标题顺序索引查找对应 `h2/h3`。

## 布局调整

文章详情页右侧主内容区改为内部双栏：

- 外层不再让整个页面承担正文滚动。
- 正文容器使用 `articleScrollRef` 独立滚动。
- 本文目录容器固定在右侧区域内，自己独立滚动。
- 阅读进度基于正文容器的 `scrollTop / (scrollHeight - clientHeight)` 计算。
- 目录高亮基于正文滚动容器内的 `IntersectionObserver` 更新。

这样符合目标结构：左边阅读正文，右边固定看目录，两边互不影响。

## 额外处理

这次顺手把一些同样依赖运行时 DOM 修改的能力改得更稳：

- 标题锚点按钮在 HTML 增强阶段写入。
- 代码块复制按钮在 HTML 增强阶段写入。
- 图片懒加载、视频 `preload="metadata"`、表格横向滚动容器也在 HTML 增强阶段处理。
- 复制标题链接、复制代码、图片放大改为文章容器上的事件委托，避免 React 重渲染后事件监听丢失。

## 验证方式

后续遇到同类问题，不要只靠肉眼点击判断，应验证这几项：

1. 正文滚动容器存在：

```js
document.querySelector("#tutorial-article-viewport")
```

2. 正文标题有稳定 `id`：

```js
Array.from(document.querySelectorAll(".tutorial-article h2[id], .tutorial-article h3[id]"))
  .map((item) => ({ id: item.id, text: item.textContent }))
```

3. 点击目录前后，正文容器 `scrollTop` 是否变化：

```js
const scroller = document.querySelector("#tutorial-article-viewport");
const before = scroller.scrollTop;
document.querySelector('[aria-label="本文目录"] button:nth-child(2)')?.click();
setTimeout(() => console.log(before, scroller.scrollTop), 800);
```

4. 阅读数或收藏数更新后，再次检查标题 `id` 是否仍存在。

## 以后同类问题的判断原则

如果一个页面同时满足以下条件，就不要依赖“渲染后手动改 DOM”作为关键逻辑：

- 正文通过 `dangerouslySetInnerHTML` 输出。
- 页面会因为阅读数、收藏、权限、加载状态等变化重新渲染。
- 交互逻辑依赖运行时追加的 `id`、class、按钮或事件监听。

更稳的做法是：

- 能写进最终 HTML 字符串的结构，尽量在渲染前写进去。
- 交互事件优先挂在稳定的 React 容器上，用事件委托处理。
- 滚动目标必须明确绑定到实际滚动容器，不要默认滚动 `window`。
- 桌面端和移动端如果使用不同容器，点击逻辑必须复用同一个滚动函数。

## 相关文件

- `src/pages/TutorialPostPage.tsx`
- `src/components/tutorial/TutorialWorkspaceShell.tsx`
- `src/index.css`

## 当前修复状态

- `npm run build` 已通过。
- 桌面端文章正文与本文目录已拆为独立滚动区域。
- 本文目录点击后会滚动左侧正文容器到对应标题。
- 移动端目录抽屉关闭后会继续执行同一套正文滚动逻辑。
