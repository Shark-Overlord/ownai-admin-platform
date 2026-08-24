package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.HomeContentConfigMapper;
import com.yupi.springbootinit.model.dto.home.HomeContentConfigDTO;
import com.yupi.springbootinit.model.dto.home.HomeContentConfigDTO.CourseItemConfig;
import com.yupi.springbootinit.model.dto.home.HomeContentConfigDTO.VideoConfig;
import com.yupi.springbootinit.model.entity.HomeContentConfigEntity;
import com.yupi.springbootinit.model.vo.home.HomeContentVO;
import com.yupi.springbootinit.model.vo.home.HomeContentVO.HomeCourseItem;
import com.yupi.springbootinit.model.vo.home.HomeContentVO.HomeVideoItem;
import com.yupi.springbootinit.service.HomeContentService;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import javax.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Slf4j
public class HomeContentServiceImpl implements HomeContentService {

    private static final long CONFIG_ID = 1L;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    @Resource
    private HomeContentConfigMapper homeContentConfigMapper;

    @Resource
    private ObjectMapper objectMapper;

    @Override
    public HomeContentVO getPublicContent() {
        ConfigSnapshot snapshot = loadSnapshot();
        return toPublicVO(snapshot.config, snapshot.updateTime);
    }

    @Override
    public HomeContentConfigDTO getAdminConfig() {
        return loadSnapshot().config;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public boolean saveAdminConfig(HomeContentConfigDTO config) {
        normalizeAndValidate(config);
        try {
            String configJson = objectMapper.writeValueAsString(config);
            HomeContentConfigEntity existing = findConfig();
            if (existing == null) {
                HomeContentConfigEntity entity = new HomeContentConfigEntity();
                entity.setId(CONFIG_ID);
                entity.setConfigJson(configJson);
                entity.setIsDelete(0);
                return homeContentConfigMapper.insert(entity) == 1;
            }
            HomeContentConfigEntity entity = new HomeContentConfigEntity();
            entity.setId(existing.getId());
            entity.setConfigJson(configJson);
            entity.setUpdateTime(new Date());
            return homeContentConfigMapper.updateById(entity) == 1;
        } catch (IOException e) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "首页配置保存失败");
        }
    }

    private ConfigSnapshot loadSnapshot() {
        try {
            HomeContentConfigEntity entity = findConfig();
            if (entity != null && StringUtils.isNotBlank(entity.getConfigJson())) {
                HomeContentConfigDTO config = objectMapper.readValue(entity.getConfigJson(), HomeContentConfigDTO.class);
                normalize(config);
                return new ConfigSnapshot(config, formatDate(entity.getUpdateTime()));
            }
        } catch (Exception e) {
            log.warn("Failed to load home content from database, using bundled defaults: {}", e.getMessage());
        }
        return new ConfigSnapshot(loadDefaultConfig(), "2026-08-24T12:00:00");
    }

    private HomeContentConfigEntity findConfig() {
        return homeContentConfigMapper.selectOne(new QueryWrapper<HomeContentConfigEntity>()
                .eq("id", CONFIG_ID)
                .eq("isDelete", 0)
                .last("limit 1"));
    }

    private HomeContentConfigDTO loadDefaultConfig() {
        ClassPathResource resource = new ClassPathResource("home-content-default.json");
        try (InputStream inputStream = resource.getInputStream()) {
            HomeContentConfigDTO config = objectMapper.readValue(inputStream, HomeContentConfigDTO.class);
            normalize(config);
            return config;
        } catch (IOException e) {
            log.error("Failed to load bundled home content defaults", e);
            return new HomeContentConfigDTO();
        }
    }

    private HomeContentVO toPublicVO(HomeContentConfigDTO config, String updateTime) {
        HomeContentVO result = new HomeContentVO();
        result.setUpdateTime(updateTime);

        if (config.getHero() != null && isEnabled(config.getHero().getEnabled())) {
            result.getHero().setEyebrow(config.getHero().getEyebrow());
            result.getHero().setTitle(config.getHero().getTitle());
            result.getHero().setDescription(config.getHero().getDescription());
            List<HomeVideoItem> videos = new ArrayList<>();
            for (VideoConfig item : config.getHero().getVideoList()) {
                if (!isEnabled(item.getEnabled())) {
                    continue;
                }
                HomeVideoItem vo = new HomeVideoItem();
                vo.setId(item.getId());
                vo.setVideoUrl(item.getVideoUrl());
                vo.setPosterUrl(item.getPosterUrl());
                vo.setAlt(item.getAlt());
                vo.setSort(item.getSort());
                videos.add(vo);
            }
            videos.sort(Comparator.comparing(HomeVideoItem::getSort)
                    .thenComparing(HomeVideoItem::getId));
            result.getHero().setVideoList(videos);
        }

        if (config.getDesign() != null && isEnabled(config.getDesign().getEnabled())) {
            result.getDesign().setTitle(config.getDesign().getTitle());
            result.getDesign().setDescription(config.getDesign().getDescription());
            result.getDesign().setCtaText(config.getDesign().getCtaText());
            result.getDesign().setCtaPath(config.getDesign().getCtaPath());
            result.getDesign().setDemoVideoUrl(config.getDesign().getDemoVideoUrl());
            result.getDesign().setDemoVideoPosterUrl(config.getDesign().getDemoVideoPosterUrl());
        }

        if (config.getCourse() != null && isEnabled(config.getCourse().getEnabled())) {
            result.getCourse().setEyebrow(config.getCourse().getEyebrow());
            result.getCourse().setTitle(config.getCourse().getTitle());
            result.getCourse().setDescription(config.getCourse().getDescription());
            result.getCourse().setCtaText(config.getCourse().getCtaText());
            result.getCourse().setCtaPath(config.getCourse().getCtaPath());
            result.getCourse().setFooterTitle(config.getCourse().getFooterTitle());
            result.getCourse().setFooterDescription(config.getCourse().getFooterDescription());
            List<HomeCourseItem> items = new ArrayList<>();
            for (CourseItemConfig item : config.getCourse().getItemList()) {
                if (!isEnabled(item.getEnabled())) {
                    continue;
                }
                HomeCourseItem vo = new HomeCourseItem();
                vo.setId(item.getId());
                vo.setTitle(item.getTitle());
                vo.setDescription(item.getDescription());
                vo.setCoverUrl(item.getCoverUrl());
                vo.setCoverAlt(item.getCoverAlt());
                vo.setStatusText(item.getStatusText());
                vo.setTargetPath(item.getTargetPath());
                vo.setSort(item.getSort());
                items.add(vo);
            }
            items.sort(Comparator.comparing(HomeCourseItem::getSort)
                    .thenComparing(HomeCourseItem::getId));
            result.getCourse().setItemList(items);
        }
        return result;
    }

    private void normalizeAndValidate(HomeContentConfigDTO config) {
        if (config == null || config.getHero() == null || config.getDesign() == null || config.getCourse() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "首页三个内容区域均不能为空");
        }
        normalize(config);

        if (isEnabled(config.getHero().getEnabled())) {
            requireText(config.getHero().getTitle(), "首屏标题不能为空");
            validateVideos(config.getHero().getVideoList());
        }
        if (isEnabled(config.getDesign().getEnabled())) {
            requireText(config.getDesign().getTitle(), "OwnAI Design 标题不能为空");
            validateHttpsUrl(config.getDesign().getDemoVideoUrl(), "演示视频 URL");
            validateOptionalHttpsUrl(config.getDesign().getDemoVideoPosterUrl(), "演示视频封面 URL");
            validateInternalPath(config.getDesign().getCtaPath(), "OwnAI Design 跳转路径");
        }
        if (isEnabled(config.getCourse().getEnabled())) {
            requireText(config.getCourse().getTitle(), "课程区标题不能为空");
            validateInternalPath(config.getCourse().getCtaPath(), "课程区跳转路径");
            validateCourseItems(config.getCourse().getItemList());
        }
    }

    private void validateVideos(List<VideoConfig> list) {
        Set<String> ids = new HashSet<>();
        for (VideoConfig item : list) {
            if (!isEnabled(item.getEnabled())) {
                continue;
            }
            requireUniqueId(item.getId(), ids, "首屏视频");
            validateHttpsUrl(item.getVideoUrl(), "首屏视频 URL");
            validateOptionalHttpsUrl(item.getPosterUrl(), "首屏视频封面 URL");
            requireText(item.getAlt(), "首屏视频说明不能为空");
        }
    }

    private void validateCourseItems(List<CourseItemConfig> list) {
        Set<String> ids = new HashSet<>();
        for (CourseItemConfig item : list) {
            if (!isEnabled(item.getEnabled())) {
                continue;
            }
            requireUniqueId(item.getId(), ids, "课程");
            requireText(item.getTitle(), "课程标题不能为空");
            validateHttpsUrl(item.getCoverUrl(), "课程封面 URL");
            validateInternalPath(item.getTargetPath(), "课程跳转路径");
        }
    }

    private void normalize(HomeContentConfigDTO config) {
        if (config.getHero() == null) {
            config.setHero(new HomeContentConfigDTO.HeroConfig());
        }
        if (config.getDesign() == null) {
            config.setDesign(new HomeContentConfigDTO.DesignConfig());
        }
        if (config.getCourse() == null) {
            config.setCourse(new HomeContentConfigDTO.CourseConfig());
        }
        if (config.getHero().getVideoList() == null) {
            config.getHero().setVideoList(new ArrayList<>());
        }
        if (config.getCourse().getItemList() == null) {
            config.getCourse().setItemList(new ArrayList<>());
        }
        for (VideoConfig item : config.getHero().getVideoList()) {
            if (item.getSort() == null) {
                item.setSort(0);
            }
        }
        for (CourseItemConfig item : config.getCourse().getItemList()) {
            if (item.getSort() == null) {
                item.setSort(0);
            }
        }
    }

    private void requireUniqueId(String id, Set<String> ids, String label) {
        requireText(id, label + " ID 不能为空");
        if (!ids.add(id.trim())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, label + " ID 不能重复");
        }
    }

    private void validateHttpsUrl(String value, String label) {
        requireText(value, label + "不能为空");
        try {
            URI uri = URI.create(value.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || StringUtils.isBlank(uri.getHost())) {
                throw new IllegalArgumentException();
            }
        } catch (IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, label + "必须是公开 HTTPS 地址");
        }
    }

    private void validateOptionalHttpsUrl(String value, String label) {
        if (StringUtils.isNotBlank(value)) {
            validateHttpsUrl(value, label);
        }
    }

    private void validateInternalPath(String value, String label) {
        requireText(value, label + "不能为空");
        String path = value.trim();
        if (!path.startsWith("/") || path.contains("#") || path.contains("://")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, label + "必须是以 / 开头的站内路径");
        }
    }

    private void requireText(String value, String message) {
        if (StringUtils.isBlank(value)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, message);
        }
    }

    private boolean isEnabled(Boolean enabled) {
        return !Boolean.FALSE.equals(enabled);
    }

    private String formatDate(Date date) {
        if (date == null) {
            return null;
        }
        LocalDateTime dateTime = LocalDateTime.ofInstant(date.toInstant(), BUSINESS_ZONE);
        return DATE_TIME_FORMATTER.format(dateTime);
    }

    private static class ConfigSnapshot {
        private final HomeContentConfigDTO config;
        private final String updateTime;

        private ConfigSnapshot(HomeContentConfigDTO config, String updateTime) {
            this.config = config;
            this.updateTime = updateTime;
        }
    }
}
