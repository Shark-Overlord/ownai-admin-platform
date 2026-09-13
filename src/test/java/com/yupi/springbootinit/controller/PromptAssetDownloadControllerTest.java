package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class PromptAssetDownloadControllerTest {
    @Test void missingOrForeignMediaNeverFallsBackToThumbnail() {
        ResourceAnalyticsService analytics=mock(ResourceAnalyticsService.class);
        Map<String,Object> asset=new HashMap<>();asset.put("memberOnly",0);asset.put("coverUrl","https://example.test/thumb.jpg");
        when(analytics.requirePublished("image_prompt",1L)).thenReturn(asset);
        JdbcTemplate db=mock(JdbcTemplate.class);
        when(db.queryForList(anyString(),any(Object[].class))).thenReturn(Collections.emptyList());
        PromptAssetDownloadController controller=new PromptAssetDownloadController(mock(UserService.class),analytics,mock(ResourceDownloadService.class),db);
        User user=new User();user.setId(10L);
        assertThrows(BusinessException.class,()->controller.source(1L,22L,user));
        assertThrows(BusinessException.class,()->controller.source(1L,null,user));
    }
    @Test void originalDownloadKeepsMembershipAccessRules() {
        ResourceAnalyticsService analytics=mock(ResourceAnalyticsService.class);
        Map<String,Object> asset=new HashMap<>();asset.put("memberOnly",1);asset.put("sourceCloudStorageUrl","https://assets.example.test/original.png");
        when(analytics.requirePublished("image_prompt",1L)).thenReturn(asset);
        JdbcTemplate db=mock(JdbcTemplate.class);
        when(db.queryForList(anyString(),any(Object[].class))).thenReturn(Collections.emptyList());
        PromptAssetDownloadController controller=new PromptAssetDownloadController(mock(UserService.class),analytics,mock(ResourceDownloadService.class),db);
        User user=new User();user.setId(10L);user.setMemberLevel("normal");
        assertThrows(BusinessException.class,()->controller.source(1L,null,user));
        user.setMemberLevel("member");user.setMemberExpireTime(new Date(System.currentTimeMillis()-10000));
        assertThrows(BusinessException.class,()->controller.source(1L,null,user));
        user.setMemberExpireTime(new Date(System.currentTimeMillis()+100000));
        assertEquals("https://assets.example.test/original.png",controller.source(1L,null,user));
    }
}
