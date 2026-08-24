package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.mapper.HomeContentConfigMapper;
import com.yupi.springbootinit.model.entity.HomeContentConfigEntity;
import com.yupi.springbootinit.model.vo.home.HomeContentVO;
import com.yupi.springbootinit.service.impl.HomeContentServiceImpl;
import java.util.Date;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.util.ReflectionTestUtils;

class HomeContentServiceImplTest {

    private HomeContentConfigMapper mapper;
    private HomeContentServiceImpl service;

    @BeforeEach
    void setUp() {
        mapper = Mockito.mock(HomeContentConfigMapper.class);
        service = new HomeContentServiceImpl();
        ReflectionTestUtils.setField(service, "homeContentConfigMapper", mapper);
        ReflectionTestUtils.setField(service, "objectMapper", new ObjectMapper());
    }

    @Test
    void bundledDefaultContainsAllInitialContent() {
        when(mapper.selectOne(any())).thenReturn(null);

        HomeContentVO result = service.getPublicContent();

        assertEquals(12, result.getHero().getVideoList().size());
        assertEquals(2, result.getCourse().getItemList().size());
        assertTrue(result.getDesign().getDemoVideoUrl().startsWith("https://"));
    }

    @Test
    void storedContentFiltersDisabledItemsAndUsesStableSort() {
        String json = "{\"hero\":{\"enabled\":true,\"title\":\"Hero\",\"videoList\":["
                + "{\"id\":\"b\",\"videoUrl\":\"https://example.com/b.mp4\",\"alt\":\"B\",\"sort\":1,\"enabled\":true},"
                + "{\"id\":\"a\",\"videoUrl\":\"https://example.com/a.mp4\",\"alt\":\"A\",\"sort\":1,\"enabled\":true},"
                + "{\"id\":\"c\",\"videoUrl\":\"https://example.com/c.mp4\",\"alt\":\"C\",\"sort\":0,\"enabled\":false}]},"
                + "\"design\":{\"enabled\":false},\"course\":{\"enabled\":true,\"title\":\"Course\",\"ctaPath\":\"/tutorials\",\"itemList\":[]}}";
        HomeContentConfigEntity entity = entity(json);
        when(mapper.selectOne(any())).thenReturn(entity);

        HomeContentVO result = service.getPublicContent();

        assertEquals(2, result.getHero().getVideoList().size());
        assertEquals("a", result.getHero().getVideoList().get(0).getId());
        assertEquals("b", result.getHero().getVideoList().get(1).getId());
        assertEquals(null, result.getDesign().getTitle());
    }

    @Test
    void emptyStoredListsReturnAsEmptyLists() {
        HomeContentConfigEntity entity = entity("{\"hero\":{\"enabled\":true,\"videoList\":[]},"
                + "\"design\":{\"enabled\":false},\"course\":{\"enabled\":true,\"itemList\":[]}}");
        when(mapper.selectOne(any())).thenReturn(entity);

        HomeContentVO result = service.getPublicContent();

        assertTrue(result.getHero().getVideoList().isEmpty());
        assertTrue(result.getCourse().getItemList().isEmpty());
    }

    private HomeContentConfigEntity entity(String json) {
        HomeContentConfigEntity entity = new HomeContentConfigEntity();
        entity.setId(1L);
        entity.setConfigJson(json);
        entity.setUpdateTime(new Date());
        entity.setIsDelete(0);
        return entity;
    }
}
