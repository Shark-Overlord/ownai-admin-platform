# 图像提示词批量审核发布记录

- 发布时间：2026-10-05 11:31（Asia/Shanghai）
- 发布模块：Backend、web-admin
- develop 提交：`ed2fad4bba34ec7bc32078f1cb55173f9764f05e`
- main 发布提交：`d072f05f3341ccdadb31966807935faa98f6607b`
- 生产备份：`/opt/springboot-init/releases/20261005-113101-d072f05`

## 发布内容

- 图像提示词审核页改为 20/50/100 张纯图片批量审核。
- 选中图片批量删除，未选中图片批量审核通过。
- 后端新增管理员批量审核接口、100 条上限、待审核状态校验和并发回滚保护。
- Prompt 资产库默认按未发布优先、同状态创建时间倒序排列。

## 本地验证

- `mvnw.cmd -B package -DskipTests`：通过。
- `mvnw.cmd '-Dtest=PromptAssetBatchReviewTest,PromptAssetAdminSortTest' test`：5/5 通过。
- `web-admin npm run build`：通过。
- `git diff --check`：通过。

## 生产验证

- `springboot-init.service`：`active`。
- `https://admin.ownai.icu/`：HTTP 200。
- 未登录登录态接口：业务码 `40100`。
- 未登录批量审核接口：业务码 `40100`，确认路由已注册且管理员权限生效。
- 线上管理后台资源包含 `admin_latest_unpublished` 和 `/promptAsset/admin/review/batch`。
- 生产 Prompt 资产库已显示最新草稿在前，记录显示为精选。
- 生产批量审核页已加载纯图片网格、默认 20 张和批量操作栏；验收未提交任何审核或删除操作。

## 线上哈希

- `/opt/springboot-init/app.jar`：`324c0e11bab6edbc8593c820f3ace7db1b4f5033028640b69e5d8d6f9e997f77`
- `/www/wwwroot/springboot-init-admin/index.html`：`014ff9ad1ca86d76403e3ac3041aa75288ebfb6a28e05862593bebd702f62d04`

本地构建产物与线上文件的 SHA-256 一致。

## 回退

```powershell
ssh ownai "cp -p '/opt/springboot-init/releases/20261005-113101-d072f05/app.jar.before' '/opt/springboot-init/app.jar' && tar -xzf '/opt/springboot-init/releases/20261005-113101-d072f05/admin.before.tar.gz' -C '/www/wwwroot/springboot-init-admin' && find '/www/wwwroot/springboot-init-admin' -type d -exec chmod 755 {} + && find '/www/wwwroot/springboot-init-admin' -type f -exec chmod 644 {} + && sudo systemctl restart springboot-init"
```
