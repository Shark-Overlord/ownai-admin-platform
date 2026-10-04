# 图像提示词现有分类迁移发布记录（2026-10-04）

## 目标与边界

- 目标分类：`图像提示词`（ID `2057283059198771201`）。
- 直接复用现有 `category`、`tag`、`category_tag`、`prompt_asset_tag` 数据结构，未新增业务表。
- 只替换每条 Prompt 属于该分类的场景标签关系；提示词正文、媒体、素材标签、会员字段和发布状态保持不变。
- 目标 50 个分类按以下顺序生效：海报版式、二十四节气、复古海报、活动海报、手绘插画、ppt、人物肖像、饮品广告、九宫格、古风、包装、社媒封面、教培、产品广告与电商、中式海报、插画、新品发布、涂鸦、电影海报、旅行、烘焙、博物馆、出版封面、数字海报、公益、香薰、手绘、食物、电商、建筑、中国红、展会、会议、3D 视觉、音乐海报、酒店、写真、咖啡、茶叶、日历、生日祝福、冬至、女摄、男摄、立春、大寒、谷雨、早安问候、春分、体育运动。

## 代码与部署

- `develop` 分类关系提交：`e265864`（`feat: 支持图像提示词分类关系安全更新`）。
- `main` 分类关系发布提交：`1d9ff61`。
- `develop` 标签排序提交：`c6172ad`（`feat: 支持分类标签安全排序`）。
- `main` 标签排序发布提交：`4fc3ab7`。
- 仅部署后端；未部署 `web-admin` 和 `web-frontend`。
- 第一次后端备份：`/opt/springboot-init/releases/20261004-204852-1d9ff61`。
- 最终后端备份：`/opt/springboot-init/releases/20261004-211917-4fc3ab7`。
- 最终生产 JAR SHA-256：`e0fa5ad11c5cd928924efaa0d4ee24fe758e2dfb88d29ad5e739c2fba775ffb4`。
- 线上服务状态：`active`；`/api/user/get/login` 返回结构化未登录响应，部署探活通过。

## 数据迁移结果

- 生产图像提示词：`10,395` 条。
- 已发布：`4,661` 条；草稿：`5,734` 条，迁移前后状态一致。
- 有明确目标分类：`9,670` 条。
- 当前 50 分类无直接匹配项：`725` 条；仅清空场景分类，仍保留在全部列表和搜索中。
- 最终场景分类关系：`30,721` 条。
- 最新审计状态：`10,395 / 10,395 success`。
- 每条写入均校验场景标签、状态、素材标签、`assetTagText`、媒体列表、受保护资源字段和草稿桥接字段。
- 23 个淘汰旧标签在解绑前的 Prompt 引用数均为 `0`，现已解绑。
- 最终分类绑定数：`50`；名称、ID 和顺序与目标列表完全一致。
- 50 个目标标签的线上聚合计数与 10,395 条决策文件逐项汇总完全一致；旧标签命中数为 `0`。

## 验证

- 定向测试：`ContentExternalServiceTest` 与 `PromptAssetSceneTagReplacementTest` 共 `10` 个测试，全部通过。
- 全量 Maven：`245` 个测试，`0` failure、`1` environment error、`2` skipped。唯一错误是手工 COS 上传测试缺少仓库根目录 `test.json`，属于运行环境缺失，与本次修改无关。
- 两次后端构建均成功，部署脚本完成备份、上传、重启和探活。

## 审计材料

目录：`C:\Users\xue\Documents\Codex\research\ownai-image-taxonomy-migration-20261004`

- `existing-taxonomy-migration-audit.jsonl`：逐条写入及校验审计，SHA-256 `fd5750c5b84e7d78f471fdb3794f0a227eb2aa419aec8e66040541a6604a48be`。
- `existing-taxonomy-migration-progress.json`：最终进度，SHA-256 `eccfcbb21201f79e6394471c3f4ea570c1ce1723408b11b243f92dc0a6445a31`。
- `existing-taxonomy-production-final.json`：最终 50 项名称、ID、顺序，SHA-256 `40a1acb4be026836e50faa75d7dba788b750a736023d1f71a3f46ba544f38818`。
- `existing-taxonomy-production-verification-final.json`：最终生产计数核验，SHA-256 `b31cbf83777685b03f343758247cd34744c898814ed7c10e656776d387967c8d`。

## 备份与回退

- 数据备份：`/opt/springboot-init/releases/20261004-existing-image-taxonomy-migration/before-prompt-tag-migration.sql.gz`。
- 数据备份 SHA-256：`1682c4b9218ad55df2c99aea5868cc2eacc41f9b03fcf699083b9ea494fb914d`。
- 数据回退助手：`/opt/springboot-init/releases/20261004-existing-image-taxonomy-migration/restore-pre-migration.py`，SHA-256 `066c1f80ebff6209711e76ffe12f828f9be2038971035582cdea8fec949b4713`。
- 回退最终排序版本：

```powershell
ssh ownai "cp -p '/opt/springboot-init/releases/20261004-211917-4fc3ab7/app.jar.before' '/opt/springboot-init/app.jar' && sudo systemctl restart springboot-init"
```

- 回退全部本次后端能力：

```powershell
ssh ownai "cp -p '/opt/springboot-init/releases/20261004-204852-1d9ff61/app.jar.before' '/opt/springboot-init/app.jar' && sudo systemctl restart springboot-init"
```

- 回退全部本次分类数据（会恢复备份中的原 Prompt 标签关系和原 24 项分类，并移除本次新增的 49 个标签）：

```powershell
ssh ownai "python3 /opt/springboot-init/releases/20261004-existing-image-taxonomy-migration/restore-pre-migration.py --confirm 1682c4b9218ad55df2c99aea5868cc2eacc41f9b03fcf699083b9ea494fb914d"
```

数据回退会短暂停止后端服务，且会把三张标签关系表恢复到该备份时点；执行前应确认备份时点之后没有需要保留的独立标签修改。
