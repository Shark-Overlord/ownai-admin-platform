# OwnAI 后端功能接口文档

更新时间：2026-07-16

## 通用约定

| 项目 | 说明 |
|---|---|
| 接口前缀 | 生产环境通常经 Nginx 转发到 `/api`，文档路径均省略域名，实际调用示例：`https://de.ownai.icu/api/user/login` |
| 返回格式 | 统一返回 `BaseResponse<T>`：`{"code":0,"data":...,"message":"ok"}` |
| 分页返回 | `Page<T>`：`records` 数据列表，`total` 总数，`current` 当前页，`size` 每页数量，`pages` 总页数 |
| 登录凭证 | 登录后从 `LoginUserVO.token` 读取 JWT，前端后续请求放入请求头，通常为 `Authorization: Bearer <token>` |
| 管理员 | 后台管理接口要求当前登录用户 `userRole=admin`，部分内容上传接口也支持 `apiSecret` 密钥免登录调用 |
| 通用分页入参 | `{ "current": 1, "pageSize": 20, "sortField": "createTime", "sortOrder": "descend" }` |

## 用户与登录

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `GET /user/login/captcha` | 否 | 获取登录图形验证码 | 无 | `{ captchaId, imageBase64, imageUrl }` |
| `POST /user/login` | 否 | 账号密码登录，返回 JWT | `{ userAccount, userPassword, captchaId, captchaCode }` | `LoginUserVO`：`{ id, userAccount, userName, userAvatar, userRole, memberLevel, token, pointBalance }` |
| `POST /user/register/email/code` | 否 | 发送邮箱注册验证码 | `{ userEmail }` | `true` |
| `POST /user/register/email` | 否 | 邮箱注册 | `{ userEmail, emailCode, userPassword, checkPassword }` | 新用户 ID |
| `POST /user/register` | 否 | 普通账号注册 | `{ userAccount, userPassword, checkPassword }` | 新用户 ID |
| `POST /user/logout` | 是 | 退出登录 | 无 | `true` |
| `GET /user/get/login` | 是 | 获取当前登录用户信息 | 无 | `LoginUserVO` |
| `POST /user/update/my` | 是 | 修改当前用户资料 | `{ userName, userAvatar, userProfile }` | `true` |
| `GET /user/stats` | 否 | 获取用户统计 | 无 | `{ total }` |
| `POST /user/add` | 管理员 | 新增用户 | `UserAddRequest`：`{ userAccount, userName, userAvatar, userRole, memberLevel, pointBalance }` | 新用户 ID |
| `POST /user/update` | 管理员 | 更新用户 | `UserUpdateRequest`：`{ id, userName, userAvatar, userRole, memberLevel, pointBalance, ... }` | `true` |
| `POST /user/delete` | 管理员 | 删除用户 | `{ id }` | `true` |
| `POST /user/delete/batch` | 管理员 | 批量删除用户 | `{ ids: [] }` | `true` |
| `GET /user/get` | 管理员 | 获取用户实体详情 | `id` query | `User` |
| `GET /user/get/vo` | 管理员 | 获取用户 VO 详情 | `id` query | `UserVO` |
| `POST /user/list/page` | 管理员 | 用户分页列表 | `UserQueryRequest` | `Page<User>` |
| `POST /user/list/page/vo` | 管理员 | 用户分页 VO 列表 | `UserQueryRequest` | `Page<UserVO>` |

## Prompt 资产库

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `POST /promptAsset/list/page/vo` | 否 | 前台 Prompt 资产分页查询，支持分类、二级场景标签、资产标签、精选/最新/最热筛选 | `PromptAssetQueryRequest`：`{ current, pageSize, assetType, categoryId, searchText, sceneTagIdList, assetTagIdList, tagIdList, displayType, sortField, sortOrder }` | `Page<PromptAssetVO>`，含 `sceneTagList`、`assetTagList`、`tagList`、`imageWidth`、`imageHeight` |
| `GET /promptAsset/home/overview` | 是 | 前台 Prompt 首页概览，返回总量、近 3 天新增、近 3 天内容 | 无 | `{ totalCount, recentThreeDaysCount, latestItems: PromptAssetVO[] }` |
| `GET /promptAsset/get/vo` | 否 | 获取已发布 Prompt 详情 | `id` query | `PromptAssetVO` |
| `POST /promptAsset/favorite/add` | 是 | 收藏 Prompt 资产 | `{ promptAssetId }` | `true` |
| `POST /promptAsset/favorite/cancel` | 是 | 取消收藏 Prompt 资产 | `{ promptAssetId }` | `true` |
| `GET /promptAsset/favorite/check` | 是 | 查询当前用户是否收藏指定 Prompt | `promptAssetId` query | `true/false` |
| `POST /promptAsset/favorite/my/list/page` | 是 | 我的 Prompt 收藏分页 | `PromptAssetQueryRequest` | `Page<PromptAssetVO>` |
| `POST /promptAsset/admin/list/page/vo` | 管理员 | 后台 Prompt 资产分页，含草稿/发布状态 | `PromptAssetQueryRequest` | `Page<PromptAssetVO>` |
| `GET /promptAsset/admin/get/vo` | 管理员 | 后台 Prompt 资产详情 | `id` query | `PromptAssetVO` |
| `POST /promptAsset/admin/add` | 管理员或密钥 | 新增 Prompt 资产 | `PromptAssetAddRequest`：`{ apiSecret, assetType, categoryId, title, summary, promptContent, promptCn, coverUrl, previewMediaUrl, status, memberOnly, sort, sceneTagIdList, assetTagIdList }` | 新资产 ID |
| `POST /promptAsset/admin/update` | 管理员或密钥 | 更新 Prompt 资产基础内容 | `PromptAssetUpdateRequest`：`{ apiSecret, id, title, summary, promptContent, promptCn, coverUrl, previewMediaUrl, status, memberOnly, sort, isFeatured, featuredSort }` | `true` |
| `POST /promptAsset/admin/update/tags` | 管理员或密钥 | 更新 Prompt 资产标签 | `{ apiSecret, id, sceneTagIdList, assetTagIdList }` | `true` |
| `POST /promptAsset/admin/delete` | 管理员 | 删除 Prompt 资产 | `{ id }` | `true` |
| `POST /promptAsset/admin/delete/batch` | 管理员 | 批量删除 Prompt 资产 | `{ ids: [] }` | `true` |
| `POST /promptAsset/admin/publish/batch` | 管理员 | 批量发布 Prompt 资产 | `{ ids: [] }` | `true` |
| `POST /promptAsset/admin/sync/image/cos` | 管理员 | 批量同步 Prompt 图片到 COS | `{ ids: [] }` | `PromptAssetImageSyncResultVO` |
| `POST /promptAsset/admin/import/visual-prompt-db` | 管理员 | 导入 visual_prompt_library SQLite | `multipart/form-data`：`file, dryRun, assetType, categoryId, syncTagsToCategory, uploadImagesToCos` | `PromptAssetImportResultVO`：`{ batchId, total, insertCount, updateCount, skipCount, errorCount, errors }` |
| `POST /promptAsset/admin/import/meigen-excel` | 管理员 | 导入美感 Prompt Excel | `multipart/form-data`：`file, dryRun, categoryId, syncTagsToCategory` | `PromptAssetImportResultVO` |
| `POST /promptAsset/admin/import/batch/list/page` | 管理员 | 查询导入批次 | `PageRequest` | `Page<PromptAssetImportBatch>` |

## 作品库

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `POST /artwork/list/page/vo` | 否 | 前台作品分页列表，支持一级分类、二级标签、会员专享筛选；非登录可看列表但无法解锁会员内容 | `ArtworkQueryRequest`：`{ current, pageSize, searchText, categoryId, tagIdList, tagName, memberOnly, sortField, sortOrder }` | `Page<ArtworkListVO>`：`{ id, title, coverUrl, videoUrl, category, tagList, imageWidth, imageHeight, memberOnly, canAccess, favorited, favoriteCount, hasSourceCode }` |
| `GET /artwork/home/overview` | 是 | 前台作品首页概览，返回总作品数、近 3 天更新数和近 3 天作品 | 无 | `{ totalCount, recentThreeDaysCount, recentItems: ArtworkListVO[] }` |
| `GET /artwork/get/vo` | 否 | 获取作品提示词内容；会员专享作品要求登录且 `memberLevel=plus/pro` | `id` query | `String`：作品提示词 |
| `GET /artwork/source/download` | 是 | 下载作品源码 ZIP；会员专享作品要求会员 | `id` query | 文件流 `application/zip` |
| `GET /artwork/preview/{id}` | 否 | 预览 HTML 原型作品 | path：`id` | HTML 文本 |
| `GET /artwork/stats` | 否 | 获取作品数量统计 | 无 | `{ total }` |
| `POST /artwork/favorite/add` | 是 | 收藏作品 | `{ artworkId }` | `true` |
| `POST /artwork/favorite/cancel` | 是 | 取消收藏作品 | `{ artworkId }` | `true` |
| `GET /artwork/favorite/check` | 是 | 查询当前用户是否收藏作品 | `artworkId` query | `true/false` |
| `POST /artwork/favorite/my/list/page` | 是 | 我的作品收藏分页 | `ArtworkQueryRequest` | `Page<ArtworkListVO>` |
| `POST /artwork/add` | 管理员或密钥 | 新增作品 | `ArtworkAddRequest`：`{ apiSecret, title, summary, description, coverUrl, videoUrl, htmlUrl, sourceZipUrl, promptContent, categoryId, tagIdList, memberOnly, status, sort }` | 新作品 ID |
| `POST /artwork/update` | 管理员或密钥 | 更新作品 | `ArtworkUpdateRequest`：`{ apiSecret, id, title, summary, description, coverUrl, videoUrl, htmlUrl, sourceZipUrl, promptContent, categoryId, tagIdList, memberOnly, status, sort }` | `true` |
| `POST /artwork/publish/batch` | 管理员 | 批量发布作品 | `{ ids: [] }` | `true` |
| `POST /artwork/offline/batch` | 管理员 | 批量下架作品，只把 `status` 设为 `0`，不删除作品数据 | `{ ids: number[] }` | `true` |
| `POST /artwork/member-only/batch` | 管理员 | 批量设置或取消会员专享 | `{ ids: number[], memberOnly: 0 \| 1 }`，`1` 为会员专享，`0` 为普通作品 | `true` |
| `POST /artwork/delete` | 管理员 | 删除作品 | `{ id }` | `true` |
| `POST /artwork/delete/batch` | 管理员 | 批量删除作品 | `{ ids: [] }` | `true` |
| `POST /artwork/admin/list/page/vo` | 管理员 | 后台作品分页列表 | `ArtworkQueryRequest` | `Page<ArtworkVO>` |
| `POST /artwork/upload/html` | 管理员 | 上传 HTML 原型 ZIP，解压并上传 COS | `multipart/form-data`：`file` | `{ htmlUrl, sourceZipUrl }` |

## 图片生成

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `POST /image/generation/create` | 是 | 创建图片生成任务，会写入同一轮对话消息；支持 API / 人工模式 | `ImageGenerationCreateRequest`：`{ generationMode:"api|manual", conversationId, prompt, aspectRatio, referenceImageUrl, sourcePromptAssetId, modelCode, imageSize, imageCount }` | `{ conversationId, messageId, assistantMessageId, taskId, status, generationMode, pointCost, apiCostCny, manualCostCny }` |
| `POST /image/generation/config/quote` | 是 | 根据模型规格、比例、张数预估积分和成本 | `{ generationMode, modelCode, imageSize, aspectRatio, imageCount, referenceImageUrl }` | `{ providerCode, modelCode, sizeCode, vendorSize, pointCost, totalPointCost, apiCostCny, manualCostCny }` |
| `GET /image/generation/conversation/current` | 是 | 获取当前用户最近一轮图片生成对话 | 无 | `ImageGenerationConversationVO` |
| `GET /image/generation/conversation/get` | 是 | 获取指定 conversationId 的完整对话 | `conversationId` query | `ImageGenerationConversationVO` |
| `POST /image/generation/conversation/list/page` | 是 | 当前用户图片生成会话分页 | `ImageGenerationMessageQueryRequest` | `Page<ImageGenerationConversationSummaryVO>` |
| `GET /image/generation/canvas/get` | 是 | 获取图片生成无限画布布局 | `conversationId` query | `{ id, userId, conversationId, layoutJson, viewportJson, createTime, updateTime }` |
| `POST /image/generation/canvas/save` | 是 | 保存图片生成无限画布布局 | `{ conversationId, layoutJson, viewportJson }` | `true` |
| `POST /image/generation/admin/message/list/page` | 管理员 | 后台图片生成消息分页 | `ImageGenerationMessageQueryRequest` | `Page<ImageGenerationMessageVO>` |
| `GET /image/generation/admin/message/get/vo` | 管理员 | 后台图片生成消息详情 | `id` query | `ImageGenerationMessageVO` |
| `POST /image/generation/admin/monitor/overview` | 管理员 | 图片生成监控概览 | `{ startTime, endTime, generationMode }` | `{ totalTasks, successTasks, failedTasks, pendingTasks, runningTasks, totalImages, totalPointCost, totalApiCostCny, totalManualCostCny, dailyTrend }` |
| `POST /image/generation/admin/conversation/list/page` | 管理员 | 后台图片生成会话分页 | `ImageGenerationMessageQueryRequest` | `Page<ImageGenerationConversationSummaryVO>` |
| `GET /image/generation/admin/conversation/get` | 管理员 | 后台图片生成会话详情 | `conversationId, userId` query | `ImageGenerationConversationVO` |
| `POST /image/generation/admin/task/pending/page` / `POST /image/generation/worker/task/pending/page` | Worker Token | 拉取 pending API 生图任务 | `{ current, pageSize }`，Header：`X-Worker-Token` | `Page<ImageGenerationWorkerTaskVO>` |
| `POST /image/generation/admin/task/update` / `POST /image/generation/worker/task/update` | Worker Token | 更新生图任务状态 | `{ taskId, status:"running|success|failed", resultImageUrls, responsePayload, errorMessage }` | `true` |
| `POST /image/generation/admin/task/manual-complete` | 管理员 | 人工上传结果完成任务 | `{ taskId, resultImageUrls }` | `true` |

## 图片生成配置

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `GET /image/generation/config/admin/provider/list` | 管理员 | 查询生图厂商配置 | 无 | `List<ImageGenerationProviderConfigVO>` |
| `POST /image/generation/config/admin/provider/add` | 管理员 | 新增生图厂商 | `{ providerCode, providerName, baseUrl, generationPath, editPath, authType, apiKey, status, isDefault, timeoutSeconds, requestSchema }` | 新配置 ID |
| `POST /image/generation/config/admin/provider/update` | 管理员 | 更新生图厂商 | `{ id, providerName, baseUrl, generationPath, editPath, authType, apiKey, status, isDefault, timeoutSeconds, requestSchema }` | `true` |
| `POST /image/generation/config/admin/provider/set-default` | 管理员 | 设置默认厂商 | `{ id }` | `true` |
| `POST /image/generation/config/admin/provider/delete` | 管理员 | 删除厂商配置 | `{ id }` | `true` |
| `POST /image/generation/config/admin/provider/test` | 管理员 | 测试厂商配置连通性 | `{ id }` | `{ success, httpStatus, elapsedMs, message }` |
| `GET /image/generation/config/admin/model/list` | 管理员 | 查询模型规格配置 | 可选 query：`providerCode, modelCode` | `List<ImageGenerationModelConfigVO>` |
| `POST /image/generation/config/admin/model/add` | 管理员 | 新增模型规格 | `{ providerCode, modelCode, sizeCode, aspectRatio, vendorSize, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, manualCostCny, supportsReferenceImage, status, sortOrder }` | 新配置 ID |
| `POST /image/generation/config/admin/model/update` | 管理员 | 更新模型规格 | 同新增，增加 `id` | `true` |
| `POST /image/generation/config/admin/model/batch-update-size` | 管理员 | 按 1K/2K/4K 批量更新同级别价格 | `{ providerCode, modelCode, sizeCode, pointCost, manualPointCost, apiInputCostCny, apiOutputCostCny, manualCostCny, supportsReferenceImage, status }` | `true` |
| `GET /image/generation/worker/provider/config` | Worker Token | Worker 获取厂商密钥和请求配置 | Header：`X-Worker-Token`，query：`providerCode` | 厂商配置，含解密后的 API Key |

## 分类与标签

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `GET /category/tree` | 否 | 获取分类树 | 无 | `List<CategoryVO>` |
| `GET /category/tags` | 否 | 获取某分类下二级标签 | `categoryId` query | `List<TagVO>` |
| `GET /category/list` | 否 | 获取分类列表 | 无 | `List<CategoryVO>` |
| `GET /category/get/vo` | 否 | 获取分类详情 | `id` query | `CategoryVO` |
| `POST /category/list/page` | 管理员 | 分类分页 | `CategoryQueryRequest` | `Page<Category>` |
| `POST /category/add` | 管理员 | 新增分类 | `{ name, parentId, description, sort }` | 新分类 ID |
| `POST /category/update` | 管理员 | 更新分类 | `{ id, name, parentId, description, sort }` | `true` |
| `POST /category/delete` | 管理员 | 删除分类 | `{ id }` | `true` |
| `POST /category/tag/add` | 管理员 | 在分类下新增并绑定标签 | `{ categoryId, name, description, sort }` | 新标签 ID |
| `POST /category/tag/bind` | 管理员 | 绑定已有标签到分类 | `{ categoryId, tagId }` | `true` |
| `POST /category/tag/unbind` | 管理员 | 解绑分类标签 | `{ categoryId, tagId }` | `true` |
| `GET /tag/list` | 否 | 获取全局标签列表 | 无 | `List<TagVO>` |
| `GET /tag/get/vo` | 否 | 获取标签详情 | `id` query | `TagVO` |
| `POST /tag/list/page` | 管理员 | 标签分页 | `TagQueryRequest` | `Page<Tag>` |
| `POST /tag/add` | 管理员 | 新增标签 | `{ name, description, sort }` | 新标签 ID |
| `POST /tag/update` | 管理员 | 更新标签 | `{ id, name, description, sort }` | `true` |
| `POST /tag/delete` | 管理员 | 删除标签 | `{ id }` | `true` |

## 积分

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `GET /point/me` | 是 | 查询我的积分余额 | 无 | `{ pointBalance }` |
| `GET /point/check-in/status` | 是 | 查询今日签到状态和奖励 | 无 | `{ checkedInToday, rewardPoints, pointBalance, lastCheckInDate }` |
| `POST /point/check-in` | 是 | 每日签到领取积分 | 无 | `{ pointBalance, rewardPoints }` |
| `POST /point/record/list/page` | 是 | 查询当前用户积分流水 | `{ current, pageSize, changeType, startTime, endTime }` | `Page<PointRecordVO>` |
| `GET /point/admin/check-in-config` | 管理员 | 获取签到配置 | 无 | `{ rewardPoints, status, description }` |
| `POST /point/admin/check-in-config/update` | 管理员 | 更新签到配置 | `{ rewardPoints, status, description }` | `true` |
| `POST /point/admin/adjust` | 管理员 | 人工加减用户积分 | `{ userId, operation:"grant|deduct", amount, description }` | `{ userId, pointBalance }` |
| `POST /point/admin/record/list/page` | 管理员 | 后台积分流水分页 | `{ current, pageSize, userId, changeType, startTime, endTime }` | `Page<PointRecordVO>` |

## 会员与会员价格

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `GET /member-price-config/plans` | 否 | 前台可购买会员套餐 | 无 | `List<MemberPriceConfigVO>` |
| `POST /member/order/create` | 是 | 创建会员订单 | `{ memberLevel, durationType, payType }` | `MemberOrderVO` |
| `POST /member/order/my/list/page` | 是 | 我的会员订单分页 | `PageRequest` | `Page<MemberOrderVO>` |
| `POST /member/cancel` | 是 | 用户取消自己的会员订单 | `{ id }` | `true` |
| `POST /member/pay/mock` | 是 | 模拟支付会员订单 | `{ orderNo }` | `true` |
| `POST /member/pay/callback` | 否 | 会员支付回调 | 回调参数 | `true` |
| `POST /member/order/list/page` | 管理员 | 后台会员订单分页 | `MemberOrderQueryRequest` | `Page<MemberOrderVO>` |
| `POST /member/admin/cancel` | 管理员 | 管理员取消会员订单 | `{ id }` | `true` |
| `POST /member/grant` | 管理员 | 后台赠送会员 | `{ userId, memberLevel, expireTime }` | `true` |
| `GET /member-price-config/list` | 管理员 | 查询所有会员价格配置 | 无 | `List<MemberPriceConfigVO>` |
| `POST /member-price-config/add` | 管理员 | 新增会员价格配置 | `{ memberLevel, durationType, price, points, status, sort }` | 新配置 ID |
| `POST /member-price-config/update` | 管理员 | 更新会员价格配置 | `{ id, memberLevel, durationType, price, points, status, sort }` | `true` |

## 作品订单

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `POST /order/create` | 是 | 创建作品订单 | `{ artworkId, payType }` | `ArtworkOrderVO` |
| `POST /order/my/list/page` | 是 | 我的作品订单分页 | `PageRequest` | `Page<ArtworkOrderVO>` |
| `POST /order/cancel` | 是 | 用户取消自己的作品订单 | `{ id }` | `true` |
| `POST /order/pay/mock` | 是 | 模拟支付作品订单 | `{ orderNo }` | `true` |
| `POST /order/pay/callback` | 否 | 作品订单支付回调 | 回调参数 | `true` |
| `POST /order/list/page` | 管理员 | 后台作品订单分页 | `ArtworkOrderQueryRequest` | `Page<ArtworkOrderVO>` |
| `POST /order/admin/cancel` | 管理员 | 管理员取消作品订单 | `{ id }` | `true` |

## 公告

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `POST /announcement/list/page` | 是 | 前台公告分页，只返回已发布且未过期公告 | `{ current, pageSize, type }` | `Page<AnnouncementVO>`，含 `readStatus` |
| `GET /announcement/get` | 是 | 公告详情 | `id` query | `AnnouncementVO` |
| `POST /announcement/read` | 是 | 标记单条公告已读 | `{ announcementId }` | `true` |
| `POST /announcement/read/all` | 是 | 标记全部公告已读 | 无 | `true` |
| `GET /announcement/unread/count` | 是 | 获取未读公告数量 | 无 | `number` |
| `POST /announcement/admin/add` | 管理员 | 新增公告 | `{ title, content, type, status, priority, publishTime, expireTime }` | 新公告 ID |
| `POST /announcement/admin/update` | 管理员 | 更新公告 | `{ id, title, content, type, status, priority, publishTime, expireTime }` | `true` |
| `POST /announcement/admin/delete` | 管理员 | 删除公告 | `{ id }` | `true` |
| `POST /announcement/admin/list/page` | 管理员 | 后台公告分页 | `AnnouncementQueryRequest` | `Page<AnnouncementVO>` |
| `POST /announcement/admin/publish` | 管理员 | 发布公告 | `{ id }` | `true` |
| `POST /announcement/admin/offline` | 管理员 | 下线公告 | `{ id }` | `true` |

## 文件与外部内容密钥

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `POST /file/upload` | 管理员或密钥 | 上传文件到 COS；内容上传流程可用密钥免登录 | `multipart/form-data`：`file, biz, apiSecret` | 文件访问 URL |
| `POST /content-api-key/admin/add` | 管理员 | 创建外部内容密钥 | `{ name, scopes, expireTime, remark }` | `{ id, plainKey, keyPrefix }`，明文密钥只在创建时返回 |
| `POST /content-api-key/admin/update` | 管理员 | 更新外部内容密钥 | `{ id, name, scopes, status, expireTime, remark }` | `true` |
| `POST /content-api-key/admin/delete` | 管理员 | 删除外部内容密钥 | `{ id }` | `true` |
| `POST /content-api-key/admin/list/page` | 管理员 | 密钥分页列表 | `{ current, pageSize, name, scope, status }` | `Page<ContentApiKeyVO>` |

## 后台工作台与日志

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `GET /dashboard/admin/overview` | 管理员 | 后台运营总览 | 无 | `{ user, content, commerce, point, imageGeneration, latestImportBatch }` |
| `POST /operation-log/list/page` | 管理员 | 操作日志分页 | `{ current, pageSize, module, action, userId, startTime, endTime }` | `Page<OperationLogVO>` |

## AI 标签重标注

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `GET /promptAsset/admin/ai-tagging/config` | 管理员 | 获取 AI 标签重标注配置 | 无 | `PromptAssetAiTagConfigVO` |
| `POST /promptAsset/admin/ai-tagging/config/save` | 管理员 | 保存 AI 标签重标注配置 | `{ provider, baseUrl, apiKey, model, promptTemplate, maxBatchSize }` | 配置 ID |
| `POST /promptAsset/admin/ai-tagging/run` | 管理员 | 扫描 Prompt 并重标注资产描述标签 | `{ dryRun, onlyUnprocessed, status, categoryId, limit }` | `{ total, successCount, errorCount, items }` |

## 文档站语雀同步

| 接口 | 登录 | 功能描述 | 入参 | 出参 |
|---|---|---|---|---|
| `GET /docs/books` | 否 | 获取文档库列表 | 无 | `List<YuqueBookVO>` |
| `GET /docs/books/{bookSlug}/toc` | 否 | 获取文档库目录 | path：`bookSlug` | `List<YuqueDocVO>` |
| `GET /docs/search` | 否 | 搜索文档 | `keyword` query | `List<YuqueDocVO>` |
| `GET /docs/{bookSlug}/{docSlug}` | 否 | 获取文档详情 | path：`bookSlug, docSlug` | `YuqueDocVO` |
| `POST /docs/admin/books` | 管理员 | 新增/更新文档库配置 | `{ bookSlug, name, description, sort }` | `true` |
| `POST /docs/admin/books/delete` | 管理员 | 删除文档库配置 | `{ id }` | `true` |
| `POST /docs/admin/sync` | 管理员 | 同步单个文档库 | `{ bookSlug }` | 同步结果 |
| `POST /docs/admin/sync/all` | 管理员 | 同步全部文档库 | 无 | 同步结果 |
| `POST /docs/admin/docs/update` | 管理员 | 更新文档元信息 | `{ id, title, slug, sort, status }` | `true` |

## 常用 VO 结构摘要

| VO | 关键字段 |
|---|---|
| `PromptAssetVO` | `id, title, summary, promptCn, coverUrl, previewMediaUrl, imageWidth, imageHeight, imageAspectRatio, category, sceneTagList, assetTagList, tagList, memberOnly, status, isFeatured, favorited, favoriteCount` |
| `ArtworkListVO` | `id, title, coverUrl, videoUrl, category, tagList, imageWidth, imageHeight, imageAspectRatio, memberOnly, canAccess, favorited, favoriteCount, hasSourceCode` |
| `TagVO` | `id, name, description, sort, createTime` |
| `CategoryVO` | `id, parentId, name, description, sort, children, tags` |
| `LoginUserVO` | `id, userAccount, userName, userAvatar, userRole, memberLevel, token, pointBalance` |
| `AnnouncementVO` | `id, title, content, type, status, priority, publishTime, expireTime, readStatus, createTime` |
