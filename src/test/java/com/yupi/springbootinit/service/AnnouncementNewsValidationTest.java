package com.yupi.springbootinit.service;

import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementAddRequest;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementUpdateRequest;
import com.yupi.springbootinit.model.entity.Announcement;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.announcement.AnnouncementVO;
import com.yupi.springbootinit.service.impl.AnnouncementServiceImpl;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AnnouncementNewsValidationTest {
    private AnnouncementAddRequest request() {
        AnnouncementAddRequest request = new AnnouncementAddRequest();
        request.setTitle("News"); request.setContent("## body");
        return request;
    }

    @Test
    void oldClientsCreatePrivateNonPopupAnnouncements() {
        AnnouncementServiceImpl service = spy(new AnnouncementServiceImpl());
        doReturn(true).when(service).save(any(Announcement.class));
        service.addAnnouncement(request(), null);
        ArgumentCaptor<Announcement> saved = ArgumentCaptor.forClass(Announcement.class);
        verify(service).save(saved.capture());
        assertFalse(saved.getValue().getPublicVisible());
        assertFalse(saved.getValue().getPopupEnabled());
    }

    @Test
    void popupRequiresPublicContentAndSummary() {
        AnnouncementServiceImpl service = new AnnouncementServiceImpl();
        AnnouncementAddRequest request = request(); request.setPopupEnabled(true);
        assertThrows(BusinessException.class, () -> service.addAnnouncement(request, null));
        request.setPublicVisible(true);
        assertThrows(BusinessException.class, () -> service.addAnnouncement(request, null));
    }

    @Test
    void actionCannotNavigateToExternalOriginsOrJavascript() {
        for (String path : new String[] {"https://evil.test", "//evil.test", "/\\evil.test", "/%2Fevil.test",
                "/%5Cevil.test", "/%0aevil", "javascript:alert(1)"}) {
            AnnouncementAddRequest request = request(); request.setActionLabel("View"); request.setActionPath(path);
            assertThrows(BusinessException.class, () -> new AnnouncementServiceImpl().addAnnouncement(request, null), path);
        }
        AnnouncementServiceImpl service = spy(new AnnouncementServiceImpl());
        doReturn(true).when(service).save(any(Announcement.class));
        AnnouncementAddRequest request = request(); request.setActionLabel("View"); request.setActionPath("/tutorials?from=news#latest");
        assertDoesNotThrow(() -> service.addAnnouncement(request, null));
    }

    @Test
    void productionJsonModulePreservesStringIdsAndStringPageTotals() throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        mapper.registerModule(new com.yupi.springbootinit.config.JsonConfig().longToStringModule());
        AnnouncementVO legacy = new AnnouncementVO(); legacy.setId(9007199254740993L);
        assertTrue(mapper.readTree(mapper.writeValueAsString(legacy)).get("id").isTextual());
        assertEquals("9007199254740993", mapper.readTree(mapper.writeValueAsString(legacy)).get("id").asText());
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<AnnouncementVO> page = new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(1, 10, 0);
        assertEquals("0", mapper.readTree(mapper.writeValueAsString(page)).get("total").textValue());
    }

    @Test
    void announcementVoUsesItsCreatorsCurrentIdentity() {
        AnnouncementServiceImpl service = new AnnouncementServiceImpl();
        UserService users = mock(UserService.class);
        ReflectionTestUtils.setField(service, "userService", users);

        Announcement announcement = new Announcement();
        announcement.setId(12L);
        announcement.setCreateUserId(7L);
        User author = new User();
        author.setId(7L);
        author.setUserName("Ownai");
        author.setUserAvatar("dicebear:line-face:creator");
        author.setUserRole("admin");
        when(users.listByIds(Collections.singleton(7L))).thenReturn(Collections.singletonList(author));

        com.baomidou.mybatisplus.extension.plugins.pagination.Page<Announcement> source =
                new com.baomidou.mybatisplus.extension.plugins.pagination.Page<>(1, 10, 1);
        source.setRecords(Collections.singletonList(announcement));
        com.baomidou.mybatisplus.extension.plugins.pagination.Page<AnnouncementVO> result =
                ReflectionTestUtils.invokeMethod(service, "toVOPage", source, Collections.emptyMap());

        assertNotNull(result);
        AnnouncementVO item = result.getRecords().get(0);
        assertEquals("Ownai", item.getAuthorName());
        assertEquals("dicebear:line-face:creator", item.getAuthorAvatar());
        assertTrue(item.getOfficial());
    }

    @Test
    void legacyEditsPreserveNewsSettingsAndDoNotResetDismissals() {
        AnnouncementServiceImpl service = spy(new AnnouncementServiceImpl());
        Announcement existing = new Announcement();
        existing.setId(12L); existing.setPublicVisible(true); existing.setPopupEnabled(true);
        existing.setSummary("summary"); existing.setActionLabel("View"); existing.setActionPath("/tutorials");
        doReturn(existing).when(service).getOne(any());
        doReturn(true).when(service).updateById(any(Announcement.class));
        AnnouncementUpdateRequest request = new AnnouncementUpdateRequest();
        request.setId(12L); request.setTitle("Edited"); request.setContent("new body"); request.setStatus("published");
        service.updateAnnouncement(request);
        ArgumentCaptor<Announcement> saved = ArgumentCaptor.forClass(Announcement.class);
        verify(service).updateById(saved.capture());
        assertTrue(saved.getValue().getPublicVisible()); assertTrue(saved.getValue().getPopupEnabled());
        assertEquals("summary", saved.getValue().getSummary());
        assertEquals("/tutorials", saved.getValue().getActionPath());
    }

    @Test
    void publishingScheduledNewsDoesNotBringItForward() {
        AnnouncementServiceImpl service = spy(new AnnouncementServiceImpl());
        Announcement existing = new Announcement(); existing.setId(12L);
        java.util.Date scheduled = new java.util.Date(System.currentTimeMillis() + 3600000);
        existing.setPublishTime(scheduled);
        doReturn(existing).when(service).getOne(any());
        doReturn(true).when(service).updateById(any(Announcement.class));
        service.publishAnnouncement(12L);
        ArgumentCaptor<Announcement> saved = ArgumentCaptor.forClass(Announcement.class);
        verify(service).updateById(saved.capture());
        assertEquals(scheduled, saved.getValue().getPublishTime());
    }
}
