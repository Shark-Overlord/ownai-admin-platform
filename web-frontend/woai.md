# www.ownai.icu 界面工程记录

## 工程定位

本工程后续只关注并维护 `https://www.ownai.icu/` 这个主站界面。

不把后台管理端、后端服务或其他子域名作为本工程的主要维护范围；这些信息只作为部署和联调时的上下文记录。

## 服务器信息

- 公网 IP：`101.200.91.81`
- SSH 用户：`root`
- 服务器已配置本机 SSH 公钥登录
- 当前开发站点服务：`de-ownai-dev.service`
- 当前开发站点目录：`/opt/de-ownai-dev`
- 当前开发站点访问地址：`http://de.ownai.icu/`

## 域名记录

- 主站界面：`https://www.ownai.icu/`
- 裸域名跳转/访问：`https://ownai.icu/`
- 开发预览域名：`http://de.ownai.icu/`
- 后台域名：`http://admin.ownai.icu/`，仅作为接口和后台上下文记录，不属于本工程主要界面范围

## GitHub 仓库

- 前端仓库：`https://github.com/KnightofMars/Design-Everything.git`
- 当前主分支：`main`

## 当前版本

- 版本日期：`2026-05-23`
- 状态：已完成部署并推送到 GitHub
- 本次部署内容：
  - 完成 `de.ownai.icu` 开发预览站点部署
  - 完成首页视觉与明暗模式背景图配置
  - 完成顶部导航 logo 与品牌文字调整
  - 将原“图像生成”导航改为 `UI素材`
  - 新增 `UI素材库` 页面，用于后续沉淀背景图、图片素材、动态背景视频、纹理材质、光效和装饰元素
  - UI 素材卡片采用首页同款卡片风格，并支持 `16:9` 与 `9:16` 两类常见素材比例

## 部署备注

- 本地改动完成后先执行：

```bash
npm run build
```

- 当前开发站点的同步方式为将修改文件上传到服务器 `/tmp/`，再安装到 `/opt/de-ownai-dev` 对应目录，并重启：

```bash
systemctl restart de-ownai-dev
systemctl is-active de-ownai-dev
```

- GitHub 推送后，仓库当前 `main` 分支已包含 2026-05-23 的首页与 UI 素材库改动。
