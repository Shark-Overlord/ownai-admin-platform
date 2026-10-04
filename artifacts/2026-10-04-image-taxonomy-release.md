# 图像提示词 50 频道分类上线记录

## 发布结果

- 上线时间：2026-10-04（Asia/Shanghai）
- 开发功能提交：`36ad6c1`（`feat: 添加版本化图像分类目录`）
- 开发集成提交：`95a500b`（`chore: 同步 main 到 develop`）
- 生产发布提交：`5b97bcd`（`release: 发布版本化图像分类目录 [skip ci]`）
- 部署模块：Backend、web-frontend
- 生产目录版本：`2106715348236095490`
- 目录状态：`ACTIVE`
- 上一个活动目录：无；停用新目录后前台自动回退到原分类
- 分类来源：小小东 50 个业务频道，频道名称与顺序保持一致

## 数据迁移

| 校验项 | 结果 |
| --- | ---: |
| 生产源记录 | 10,395 |
| 已发布源记录 | 4,661 |
| 草稿源记录 | 5,734 |
| 完成频道分配 | 9,670 |
| 范围或数据例外 | 725 |
| 频道 | 50 |
| 频道关系 | 30,721 |
| 幂等导入批次 | 20 |
| 待分类 | 0 |

迁移只新增四张版本化目录表，不修改 `prompt_asset`、旧分类、旧标签或发布状态。每条导入记录都校验源状态和更新时间；目录在完整导入、数量复核和零漂移检查后才由 `REVIEWED` 原子切换为 `ACTIVE`。

## 验证

- 导入包校验通过：10,395 条决策、9,670 条有效分配、725 条例外、30,721 条关系，无重复导入。
- `ImageCatalogServiceTest`：3 个测试全部通过，覆盖幂等导入、源数据漂移拒绝、审核、激活和停用回退。
- 完整 Maven：245 个测试，244 个通过、2 个跳过；唯一错误为手工 `CosManagerTest` 缺少根目录 `test.json`，属于仓库说明中的环境条件，不是产品回归。
- `web-admin` 与 `web-frontend` 生产构建均通过。
- 激活后逐一调用 50 个频道的公开筛选接口，分页总数全部与活动目录的已发布计数一致。
- 生产页面已在 1440×1000 桌面端和 390×844 移动端验收浅色、深色主题；50 个频道完整出现，作品正常加载，无横向溢出。

## 部署与备份

- 服务器备份：`/opt/springboot-init/releases/20261004-195335-5b97bcd`
- 后端 SHA-256：`1d7a9215585d3c3e1ebf08b71ef9b4149b36b6a1060a34600568ea8293a36d18`
- 用户前台 `index.html` SHA-256：`465d9c2916fa6e35a105af3ae1df659c03127909eebd0c8446fa32dda5823566`

## 回滚

先停用当前目录，使前台立即回退到原分类：

```powershell
python "C:\Users\xue\Documents\Codex\research\ownai-image-taxonomy-migration-20261004\deploy_shadow_catalog.py" --deactivate --version-id 2106715348236095490
```

如需同时回退后端和用户前台：

```powershell
ssh ownai "cp -p '/opt/springboot-init/releases/20261004-195335-5b97bcd/app.jar.before' '/opt/springboot-init/app.jar' && tar -xzf '/opt/springboot-init/releases/20261004-195335-5b97bcd/frontend.before.tar.gz' -C '/www/wwwroot/ownai' && find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type d -exec chmod 755 {} + 2>/dev/null; find '/www/wwwroot/springboot-init-admin' '/www/wwwroot/ownai' -type f -exec chmod 644 {} + 2>/dev/null && sudo systemctl restart springboot-init"
```

原提示词和旧分类数据始终保留；新目录表也保留完整审计记录，便于排查或重新激活。
