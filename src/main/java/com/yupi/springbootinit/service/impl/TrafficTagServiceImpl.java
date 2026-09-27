package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.TrafficTagMapper;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagAddRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagPublicQueryRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagQueryRequest;
import com.yupi.springbootinit.model.dto.traffictag.TrafficTagUpdateRequest;
import com.yupi.springbootinit.model.entity.TrafficTag;
import com.yupi.springbootinit.model.vo.traffictag.TrafficTagOverviewVO;
import com.yupi.springbootinit.model.vo.traffictag.TrafficTagVO;
import com.yupi.springbootinit.service.TrafficTagService;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import jakarta.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TrafficTagServiceImpl extends ServiceImpl<TrafficTagMapper, TrafficTag>
        implements TrafficTagService {

    private static final Set<String> PLATFORMS = Set.of("douyin", "xiaohongshu");
    private static final Set<String> STATUSES = Set.of("long_term", "active", "upcoming", "expired");
    private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() { };

    @Resource
    private ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public long addTrafficTag(TrafficTagAddRequest request) {
        validate(request);
        String externalId = normalizeExternalId(request.getExternalId());
        if (externalId != null) {
            TrafficTag existing = lambdaQuery().eq(TrafficTag::getSeedKey, externalId).one();
            if (existing != null) return existing.getId();
        }
        TrafficTag item = new TrafficTag();
        copyRequest(request, item);
        item.setSeedKey(externalId);
        item.setCreateTime(new Date());
        item.setUpdateTime(new Date());
        item.setIsDelete(0);
        ThrowUtils.throwIf(!save(item), ErrorCode.OPERATION_ERROR, "新增流量标签失败");
        return item.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean updateTrafficTag(TrafficTagUpdateRequest request) {
        ThrowUtils.throwIf(request == null || request.getId() == null || request.getId() <= 0,
                ErrorCode.PARAMS_ERROR);
        validate(request);
        TrafficTag old = getById(request.getId());
        ThrowUtils.throwIf(old == null, ErrorCode.NOT_FOUND_ERROR, "流量标签不存在");
        TrafficTag item = new TrafficTag();
        copyRequest(request, item);
        item.setId(request.getId());
        item.setSeedKey(old.getSeedKey());
        item.setUpdateTime(new Date());
        ThrowUtils.throwIf(!updateById(item), ErrorCode.OPERATION_ERROR, "更新流量标签失败");
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean deleteTrafficTag(long id) {
        ThrowUtils.throwIf(id <= 0, ErrorCode.PARAMS_ERROR);
        ThrowUtils.throwIf(getById(id) == null, ErrorCode.NOT_FOUND_ERROR, "流量标签不存在");
        ThrowUtils.throwIf(!removeById(id), ErrorCode.OPERATION_ERROR, "删除流量标签失败");
        return true;
    }

    @Override
    public TrafficTagVO getTrafficTag(long id) {
        ThrowUtils.throwIf(id <= 0, ErrorCode.PARAMS_ERROR);
        TrafficTag item = getById(id);
        ThrowUtils.throwIf(item == null, ErrorCode.NOT_FOUND_ERROR, "流量标签不存在");
        return toVO(item);
    }

    @Override
    public Page<TrafficTagVO> listAdminByPage(TrafficTagQueryRequest request) {
        TrafficTagQueryRequest safe = request == null ? new TrafficTagQueryRequest() : request;
        int pageSize = Math.max(1, Math.min(safe.getPageSize(), 100));
        QueryWrapper<TrafficTag> wrapper = new QueryWrapper<>();
        if (StringUtils.isNotBlank(safe.getKeyword())) {
            wrapper.and(query -> query.like("title", safe.getKeyword().trim())
                    .or().like("description", safe.getKeyword().trim()));
        }
        wrapper.eq(StringUtils.isNotBlank(safe.getPlatform()), "platform", safe.getPlatform());
        wrapper.eq(StringUtils.isNotBlank(safe.getCategory()), "category", safe.getCategory());
        wrapper.eq(StringUtils.isNotBlank(safe.getStatus()), "status", safe.getStatus());
        wrapper.eq(safe.getEnabled() != null, "enabled", safe.getEnabled());
        wrapper.orderByDesc("sortOrder").orderByDesc("sourceUpdatedTime").orderByDesc("id");
        Page<TrafficTag> page = page(new Page<>(Math.max(1, safe.getCurrent()), pageSize), wrapper);
        Page<TrafficTagVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(page.getRecords().stream().map(this::toVO).collect(Collectors.toList()));
        return result;
    }

    @Override
    public TrafficTagOverviewVO getPublicOverview(TrafficTagPublicQueryRequest request) {
        TrafficTagPublicQueryRequest safe = request == null ? new TrafficTagPublicQueryRequest() : request;
        List<TrafficTag> all = list(new QueryWrapper<TrafficTag>().eq("enabled", true));
        Map<String, Long> platformCounts = countBy(all, TrafficTag::getPlatform);
        Map<String, Long> categoryCounts = countBy(all, TrafficTag::getCategory);

        List<TrafficTag> filtered = all.stream()
                .filter(item -> matches(safe.getPlatform(), item.getPlatform()))
                .filter(item -> matches(safe.getCategory(), item.getCategory()))
                .filter(item -> matches(safe.getStatus(), item.getStatus()))
                .collect(Collectors.toCollection(ArrayList::new));
        filtered.sort(publicComparator(safe.getSort()));

        TrafficTagOverviewVO overview = new TrafficTagOverviewVO();
        overview.setItems(filtered.stream().map(this::toVO).collect(Collectors.toList()));
        overview.setPlatformCounts(platformCounts);
        overview.setCategoryCounts(categoryCounts);
        overview.setTotal(all.size());
        return overview;
    }

    private void validate(TrafficTagAddRequest request) {
        ThrowUtils.throwIf(request == null, ErrorCode.PARAMS_ERROR);
        ThrowUtils.throwIf(StringUtils.isBlank(request.getTitle()) || request.getTitle().trim().length() > 120,
                ErrorCode.PARAMS_ERROR, "标题不能为空且最多 120 字");
        ThrowUtils.throwIf(!PLATFORMS.contains(normalize(request.getPlatform())), ErrorCode.PARAMS_ERROR,
                "不支持的平台");
        ThrowUtils.throwIf(StringUtils.isBlank(request.getCategory()) || request.getCategory().trim().length() > 50,
                ErrorCode.PARAMS_ERROR, "分类不能为空且最多 50 字");
        ThrowUtils.throwIf(!STATUSES.contains(normalize(request.getStatus())), ErrorCode.PARAMS_ERROR,
                "不支持的状态");
        ThrowUtils.throwIf(request.getHeat() != null && request.getHeat() < 0, ErrorCode.PARAMS_ERROR,
                "热度不能小于 0");
        validateList(request.getTags(), 30, 80, "标签");
        validateList(request.getRequirements(), 20, 300, "参与要求");
        ThrowUtils.throwIf(StringUtils.length(request.getDescription()) > 3000, ErrorCode.PARAMS_ERROR,
                "说明最多 3000 字");
        ThrowUtils.throwIf(StringUtils.length(request.getSourceUrl()) > 1000, ErrorCode.PARAMS_ERROR,
                "来源链接最多 1000 字");
        ThrowUtils.throwIf(StringUtils.length(request.getExternalId()) > 120, ErrorCode.PARAMS_ERROR,
                "外部唯一 ID 最多 120 字");
    }

    private void validateList(List<String> values, int maxItems, int maxLength, String label) {
        if (values == null) return;
        ThrowUtils.throwIf(values.size() > maxItems, ErrorCode.PARAMS_ERROR, label + "数量过多");
        ThrowUtils.throwIf(values.stream().anyMatch(value -> StringUtils.length(value) > maxLength),
                ErrorCode.PARAMS_ERROR, label + "单项内容过长");
    }

    private void copyRequest(TrafficTagAddRequest request, TrafficTag item) {
        BeanUtils.copyProperties(request, item, "tags", "requirements");
        item.setTitle(request.getTitle().trim());
        item.setPlatform(normalize(request.getPlatform()));
        item.setCategory(request.getCategory().trim());
        item.setStatus(normalize(request.getStatus()));
        item.setDateLabel(StringUtils.trimToEmpty(request.getDateLabel()));
        item.setHeat(request.getHeat() == null ? 0 : request.getHeat());
        item.setTagsJson(writeList(request.getTags()));
        item.setRequirementsJson(writeList(request.getRequirements()));
        item.setDescription(StringUtils.trimToEmpty(request.getDescription()));
        item.setSourceUrl(StringUtils.trimToEmpty(request.getSourceUrl()));
        item.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        item.setEnabled(request.getEnabled() == null || request.getEnabled());
        item.setSourceUpdatedTime(request.getSourceUpdatedTime() == null ? new Date() : request.getSourceUpdatedTime());
    }

    private String writeList(List<String> values) {
        List<String> normalized = values == null ? Collections.emptyList() : values.stream()
                .filter(StringUtils::isNotBlank).map(String::trim).distinct().collect(Collectors.toList());
        try {
            return objectMapper.writeValueAsString(normalized);
        } catch (JsonProcessingException e) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "列表数据序列化失败");
        }
    }

    private List<String> readList(String json) {
        if (StringUtils.isBlank(json)) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, STRING_LIST_TYPE);
        } catch (JsonProcessingException e) {
            return Collections.emptyList();
        }
    }

    private TrafficTagVO toVO(TrafficTag item) {
        TrafficTagVO vo = new TrafficTagVO();
        BeanUtils.copyProperties(item, vo);
        vo.setExternalId(item.getSeedKey());
        vo.setTags(readList(item.getTagsJson()));
        vo.setRequirements(readList(item.getRequirementsJson()));
        return vo;
    }

    private boolean matches(String expected, String actual) {
        return StringUtils.isBlank(expected) || StringUtils.equalsIgnoreCase(expected.trim(), actual);
    }

    private Map<String, Long> countBy(List<TrafficTag> items,
            java.util.function.Function<TrafficTag, String> classifier) {
        Map<String, Long> counts = items.stream()
                .filter(item -> StringUtils.isNotBlank(classifier.apply(item)))
                .collect(Collectors.groupingBy(classifier, LinkedHashMap::new, Collectors.counting()));
        counts.put("all", (long) items.size());
        return counts;
    }

    private Comparator<TrafficTag> publicComparator(String sort) {
        String normalized = normalize(sort);
        Comparator<TrafficTag> byNewest = Comparator.comparing(TrafficTag::getSourceUpdatedTime,
                Comparator.nullsLast(Comparator.reverseOrder())).thenComparing(TrafficTag::getId,
                        Comparator.nullsLast(Comparator.reverseOrder()));
        if ("hot".equals(normalized)) {
            return Comparator.comparing(TrafficTag::getHeat, Comparator.nullsLast(Comparator.reverseOrder()))
                    .thenComparing(byNewest);
        }
        if ("latest".equals(normalized)) return byNewest;
        Map<String, Integer> rank = new LinkedHashMap<>();
        Arrays.asList("active", "long_term", "upcoming", "expired")
                .forEach(status -> rank.put(status, rank.size()));
        return Comparator.comparing((TrafficTag item) -> rank.getOrDefault(item.getStatus(), 99))
                .thenComparing(TrafficTag::getSortOrder, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(byNewest);
    }

    private String normalize(String value) {
        return StringUtils.trimToEmpty(value).toLowerCase(Locale.ROOT);
    }

    private String normalizeExternalId(String value) {
        return StringUtils.trimToNull(value);
    }
}
