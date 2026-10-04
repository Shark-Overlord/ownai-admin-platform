# 2026-10-04 图像分类目录回退记录

## 回退原因

版本化图像分类目录新增了四张旁路表，偏离了“直接修改原有图像 Prompt 分类”的目标。本次回退删除相关后端接口、查询参数、前端适配、建表 SQL 和测试，恢复原有 `category_tag` 与 `prompt_asset_tag` 分类链路。

## 代码版本

- 错误功能提交：`36ad6c1`（`feat: 添加版本化图像分类目录`）
- 错误生产发布提交：`5b97bcd`（`release: 发布版本化图像分类目录 [skip ci]`）
- `develop` 回退提交：`c55be3f`（`revert: 移除版本化图像分类目录`）

## 生产应用回退

- 回退来源：`/opt/springboot-init/releases/20261004-195335-5b97bcd`
- 后端恢复文件：`app.jar.before`
- 用户前台恢复文件：`frontend.before.tar.gz`
- 恢复后后端 SHA-256：`bf146f472e9da7bcbb5a08accff8b50c4ccaa4df858bf8352bcfbef838032bde`
- 恢复后用户前台 `index.html` SHA-256：`cbb1568f0b8dcdf2438f20bebf517acd03e6e52ca7d053b3a2032132710d8e1a`
- `springboot-init.service`：`active`
- `GET /api/user/get/login`：返回业务码 `40100`，应用已就绪
- `GET /api/imageCatalog/active`：HTTP 404，错误目录接口已撤下

## 线上分支来源核对

- 恢复后的后端哈希与 2026-09-27 `main` 发布提交 `452d3c4` 的记录完全一致。
- 恢复后的用户前台来自 2026-09-30 的现场备份。该次部署目录名仍是部署前的 `a2948b2`，随后同一工作区的前端变更提交为 `develop` 的 `1da4480`。因此错误发布前线上实际为“后端 main + 用户前台 develop”的组合。
- 本次直接恢复服务器现场备份，没有用当前 `main` 或当前 `develop` 重新构建覆盖线上。

## 数据库清理

清理前仅包含本次错误方案写入的数据：

- `image_catalog_version`：1 条
- `image_channel`：50 条
- `image_catalog_import_batch`：20 条
- `image_channel_member`：30,721 条

删除前已单独导出：

- 备份文件：`/opt/springboot-init/releases/20261004-image-taxonomy-rollback/removed-shadow-catalog.sql.gz`
- SHA-256：`6def55b81388c039e44f1063714edd0676f7199a81149a49f81a1e32b4154cd1`

上述四张表已删除，`information_schema` 复核结果为 0。原有 `tag`、`category_tag`、`prompt_asset_tag`、Prompt 内容及其他业务表均未修改。

## 本地验证

- `web-frontend`: `npm run build` 通过。
- 后端：242 项测试，0 失败、1 个环境错误、2 个跳过；唯一错误为手工 `CosManagerTest` 缺少仓库根目录 `test.json`，与本次回退无关。
- `git diff --cached --check`：通过。

## 数据库备份恢复命令

仅在明确需要恢复这套已撤销的旁路表时使用：

```bash
gunzip -c /opt/springboot-init/releases/20261004-image-taxonomy-rollback/removed-shadow-catalog.sql.gz | mysql <database>
```
