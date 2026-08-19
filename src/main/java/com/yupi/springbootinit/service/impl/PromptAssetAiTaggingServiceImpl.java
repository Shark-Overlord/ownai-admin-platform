package com.yupi.springbootinit.service.impl;

import cn.hutool.core.collection.CollUtil;
import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.constant.AiTaskConstant;
import com.yupi.springbootinit.mapper.CategoryMapper;
import com.yupi.springbootinit.mapper.PromptAssetMapper;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAiTagRunRequest;
import com.yupi.springbootinit.model.entity.AiTaskConfig;
import com.yupi.springbootinit.model.entity.Category;
import com.yupi.springbootinit.model.entity.PromptAsset;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagItemResultVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetAiTagRunResultVO;
import com.yupi.springbootinit.service.AiConfigService;
import com.yupi.springbootinit.service.PromptAssetAiTaggingService;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class PromptAssetAiTaggingServiceImpl implements PromptAssetAiTaggingService {

    private static final int DEFAULT_MAX_TAGS = 8;

    private static final int DEFAULT_LIMIT = 20;

    private static final int MAX_LIMIT = 1000;

    private static final int MAX_PROMPT_CHARS = 6000;

    @Resource
    private PromptAssetMapper promptAssetMapper;

    @Resource
    private CategoryMapper categoryMapper;

    @Resource
    private AiConfigService aiConfigService;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public PromptAssetAiTagRunResultVO runTagging(PromptAssetAiTagRunRequest request) {
        AiTaskConfig taskConfig = aiConfigService.getEnabledTask(AiTaskConstant.PROMPT_ASSET_TAGGING);
        boolean dryRun = request == null || !Boolean.FALSE.equals(request.getDryRun());
        boolean overwriteExisting = request == null || !Boolean.FALSE.equals(request.getOverwriteExisting());
        List<PromptAsset> assets = listTargetAssets(request, overwriteExisting);
        PromptAssetAiTagRunResultVO resultVO = new PromptAssetAiTagRunResultVO();
        resultVO.setDryRun(dryRun);
        resultVO.setTotalCount(assets.size());
        for (PromptAsset asset : assets) {
            PromptAssetAiTagItemResultVO item = new PromptAssetAiTagItemResultVO();
            item.setId(asset.getId());
            item.setTitle(asset.getTitle());
            try {
                if (!overwriteExisting && Integer.valueOf(1).equals(asset.getAiTagStatus())) {
                    item.setSuccess(true);
                    item.setUpdated(false);
                    item.setErrorMessage("Skipped because AI tag status is processed");
                    resultVO.setSkipCount(resultVO.getSkipCount() + 1);
                    resultVO.getItemList().add(item);
                    continue;
                }
                List<String> tagNames = callDeepSeekForTags(taskConfig, asset);
                item.setAssetTagList(tagNames);
                item.setSuccess(true);
                item.setUpdated(!dryRun);
                resultVO.setSuccessCount(resultVO.getSuccessCount() + 1);
                if (!dryRun) {
                    PromptAsset updateAsset = new PromptAsset();
                    updateAsset.setId(asset.getId());
                    updateAsset.setAssetTagText(JSONUtil.toJsonStr(tagNames));
                    updateAsset.setAiTagStatus(1);
                    int updateCount = promptAssetMapper.updateById(updateAsset);
                    if (updateCount <= 0) {
                        throw new BusinessException(ErrorCode.OPERATION_ERROR, "Update prompt asset tags failed");
                    }
                    resultVO.setUpdateCount(resultVO.getUpdateCount() + 1);
                }
            } catch (Exception e) {
                log.warn("AI prompt asset tagging failed, assetId={}", asset.getId(), e);
                item.setSuccess(false);
                item.setUpdated(false);
                item.setErrorMessage(StringUtils.left(e.getMessage(), 500));
                resultVO.setErrorCount(resultVO.getErrorCount() + 1);
            }
            resultVO.getItemList().add(item);
        }
        return resultVO;
    }

    private List<PromptAsset> listTargetAssets(PromptAssetAiTagRunRequest request, boolean overwriteExisting) {
        PromptAssetAiTagRunRequest safeRequest = request == null ? new PromptAssetAiTagRunRequest() : request;
        int limit = safeRequest.getLimit() == null || safeRequest.getLimit() <= 0 ? DEFAULT_LIMIT : safeRequest.getLimit();
        limit = Math.min(limit, MAX_LIMIT);
        QueryWrapper<PromptAsset> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("id", "assetType", "categoryId", "title", "summary", "promptContent", "promptCn",
                "sourceRepoName", "assetTagText", "aiTagStatus", "visualAssetType", "scenario", "visualStyle",
                "qualityLevel");
        List<Long> idList = normalizeIds(safeRequest.getIdList());
        queryWrapper.in(CollUtil.isNotEmpty(idList), "id", idList);
        queryWrapper.eq(StringUtils.isNotBlank(safeRequest.getAssetType()), "assetType", safeRequest.getAssetType());
        queryWrapper.eq(safeRequest.getCategoryId() != null && safeRequest.getCategoryId() > 0,
                "categoryId", safeRequest.getCategoryId());
        queryWrapper.eq(safeRequest.getStatus() != null, "status", safeRequest.getStatus());
        if (!overwriteExisting) {
            queryWrapper.and(wrapper -> wrapper.isNull("aiTagStatus").or().eq("aiTagStatus", 0));
        }
        String searchText = StringUtils.trimToNull(safeRequest.getSearchText());
        if (StringUtils.isNotBlank(searchText)) {
            queryWrapper.and(wrapper -> wrapper.like("title", searchText)
                    .or().like("summary", searchText)
                    .or().like("promptContent", searchText)
                    .or().like("promptCn", searchText)
                    .or().like("sourceRepoName", searchText));
        }
        queryWrapper.orderByDesc("updateTime", "id");
        queryWrapper.last("limit " + limit);
        return promptAssetMapper.selectList(queryWrapper);
    }

    private List<String> callDeepSeekForTags(AiTaskConfig config, PromptAsset asset) {
        int maxTags = resolveMaxTags(config);
        String content = aiConfigService.executeTask(AiTaskConstant.PROMPT_ASSET_TAGGING,
                buildAssetTaggingUserPrompt(asset, maxTags));
        List<String> tags = parseTagNames(content, maxTags);
        if (CollUtil.isEmpty(tags)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "DeepSeek returned empty asset tags");
        }
        return tags;
    }

    private String buildAssetTaggingUserPrompt(PromptAsset asset, int maxTags) {
        Category category = asset.getCategoryId() == null ? null : categoryMapper.selectById(asset.getCategoryId());
        StringBuilder builder = new StringBuilder();
        builder.append("请为下面这条 Prompt 资产重新生成资产描述标签，最多 ").append(maxTags).append(" 个。\n");
        builder.append("不要返回二级场景标签，不要返回 image_prompt、gpt-image-2、仓库名这类元信息。\n\n");
        appendField(builder, "标题", asset.getTitle(), 300);
        appendField(builder, "分类", category == null ? null : category.getName(), 100);
        appendField(builder, "来源仓库", asset.getSourceRepoName(), 200);
        appendField(builder, "摘要", asset.getSummary(), 800);
        appendField(builder, "中文说明", asset.getPromptCn(), 1500);
        appendField(builder, "原始 Prompt", asset.getPromptContent(), MAX_PROMPT_CHARS);
        appendField(builder, "当前视觉类型", asset.getVisualAssetType(), 200);
        appendField(builder, "当前场景", asset.getScenario(), 200);
        appendField(builder, "当前风格", asset.getVisualStyle(), 200);
        appendField(builder, "当前质量等级", asset.getQualityLevel(), 200);
        return builder.toString();
    }

    private void appendField(StringBuilder builder, String label, String value, int maxLength) {
        String safeValue = StringUtils.trimToNull(value);
        if (safeValue == null) {
            return;
        }
        builder.append(label).append("：").append(StringUtils.left(safeValue, maxLength)).append("\n");
    }

    private List<String> parseTagNames(String content, int maxTags) {
        String normalizedContent = StringUtils.trimToEmpty(content)
                .replace("```json", "")
                .replace("```JSON", "")
                .replace("```", "")
                .trim();
        int objectStart = normalizedContent.indexOf('{');
        int objectEnd = normalizedContent.lastIndexOf('}');
        if (objectStart >= 0 && objectEnd > objectStart) {
            normalizedContent = normalizedContent.substring(objectStart, objectEnd + 1);
        }
        try {
            JSONObject jsonObject = JSONUtil.parseObj(normalizedContent);
            JSONArray array = jsonObject.getJSONArray("assetTags");
            if (array == null) {
                array = jsonObject.getJSONArray("tags");
            }
            if (array != null) {
                List<String> names = new ArrayList<>();
                for (Object item : array) {
                    names.add(String.valueOf(item));
                }
                return normalizeTagNames(names, maxTags);
            }
        } catch (Exception e) {
            log.warn("Parse AI asset tag JSON failed, content={}", content, e);
        }
        String[] parts = StringUtils.split(normalizedContent
                .replace("[", "")
                .replace("]", "")
                .replace("\"", "")
                .replace("'", "")
                .replace("，", ",")
                .replace("、", ",")
                .replace(";", ",")
                .replace("\n", ","), ",");
        if (parts == null) {
            return new ArrayList<>();
        }
        return normalizeTagNames(Arrays.asList(parts), maxTags);
    }

    private List<String> normalizeTagNames(List<String> rawNames, int maxTags) {
        if (CollUtil.isEmpty(rawNames)) {
            return new ArrayList<>();
        }
        return rawNames.stream()
                .map(StringUtils::trimToNull)
                .filter(StringUtils::isNotBlank)
                .map(name -> StringUtils.removeEnd(StringUtils.removeStart(name, "#"), "。"))
                .map(name -> StringUtils.left(name, 32))
                .filter(name -> !StringUtils.equalsAnyIgnoreCase(name, "image_prompt", "video_prompt", "gpt-image-2"))
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .limit(Math.max(maxTags, 1))
                .collect(Collectors.toList());
    }

    private List<Long> normalizeIds(List<Long> ids) {
        if (CollUtil.isEmpty(ids)) {
            return new ArrayList<>();
        }
        return ids.stream()
                .filter(id -> id != null && id > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new))
                .stream()
                .collect(Collectors.toList());
    }

    private int resolveMaxTags(AiTaskConfig config) {
        Integer maxTags = config.getMaxResultCount();
        if (maxTags == null || maxTags <= 0) {
            return DEFAULT_MAX_TAGS;
        }
        return Math.min(maxTags, 20);
    }

}
