package com.yupi.springbootinit.service.impl;

import static org.junit.jupiter.api.Assertions.assertTrue;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetQueryRequest;
import com.yupi.springbootinit.model.entity.PromptAsset;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class PromptAssetAdminSortTest {

    @Test
    void sortsUnpublishedAssetsFirstAndNewestWithinEachStatus() {
        PromptAssetQueryRequest request = new PromptAssetQueryRequest();
        request.setListType("admin_latest_unpublished");

        QueryWrapper<PromptAsset> wrapper = ReflectionTestUtils.invokeMethod(
                new PromptAssetServiceImpl(), "getQueryWrapper", request);
        String sql = wrapper.getCustomSqlSegment().replaceAll("\\s+", " ").toLowerCase();

        assertTrue(sql.contains("order by status asc,createtime desc,id desc"), sql);
    }
}
