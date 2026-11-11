package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doReturn;

import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.service.impl.ArtworkServiceImpl;
import com.yupi.springbootinit.exception.BusinessException;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class ArtworkAccessTest {

    @Test
    void adminWithNormalMemberLevelShouldNotAccessMemberOnlyArtwork() {
        ArtworkServiceImpl artworkService = Mockito.spy(new ArtworkServiceImpl());
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setStatus(1);
        artwork.setMemberOnly(1);
        doReturn(artwork).when(artworkService).getById(1L);

        User adminNormalUser = new User();
        adminNormalUser.setId(10L);
        adminNormalUser.setUserRole(UserConstant.ADMIN_ROLE);
        adminNormalUser.setMemberLevel(MemberLevelEnum.NORMAL.getValue());

        org.springframework.test.util.ReflectionTestUtils.setField(artworkService, "artworkAccessMapper",
                Mockito.mock(com.yupi.springbootinit.mapper.ArtworkAccessMapper.class));
        assertFalse(artworkService.hasArtworkAccess(1L, adminNormalUser));
    }

    @Test
    void paidMemberShouldAccessMemberOnlyArtwork() {
        ArtworkServiceImpl artworkService = Mockito.spy(new ArtworkServiceImpl());
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setStatus(1);
        artwork.setMemberOnly(1);
        doReturn(artwork).when(artworkService).getById(1L);

        User member = new User();
        member.setId(11L);
        member.setUserRole(UserConstant.DEFAULT_ROLE);
        member.setMemberLevel(MemberLevelEnum.MEMBER.getValue());

        assertTrue(artworkService.hasArtworkAccess(1L, member));
    }

    @Test
    void publicArtworkShouldRemainAccessibleWithoutLogin() {
        ArtworkServiceImpl artworkService = Mockito.spy(new ArtworkServiceImpl());
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setStatus(1);
        artwork.setMemberOnly(0);
        doReturn(artwork).when(artworkService).getById(1L);

        assertTrue(artworkService.hasArtworkAccess(1L, null));
    }

    @Test
    void draftDeconstructionIsAdminPreviewOnly() {
        ArtworkServiceImpl artworkService = Mockito.spy(new ArtworkServiceImpl());
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setTitle("Draft");
        artwork.setStatus(0);
        artwork.setIsDeconstructed(0);
        artwork.setDeviceFrame("website");
        doReturn(artwork).when(artworkService).getById(1L);
        org.springframework.test.util.ReflectionTestUtils.setField(artworkService, "objectMapper",
                new com.fasterxml.jackson.databind.ObjectMapper());

        assertThrows(BusinessException.class,
                () -> artworkService.getArtworkDeconstruction(1L, null, false));
        assertEquals("Draft", artworkService.getArtworkDeconstruction(1L, null, true).getTitle());
    }

    @Test
    void publishedFreeDeconstructionIsPubliclyReadable() {
        ArtworkServiceImpl artworkService = Mockito.spy(new ArtworkServiceImpl());
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setTitle("Published");
        artwork.setStatus(1);
        artwork.setMemberOnly(0);
        artwork.setIsDeconstructed(1);
        artwork.setDeviceFrame("website");
        artwork.setPromptData("{\"colors\":[]}");
        artwork.setPartsData("[]");
        artwork.setAssetsData("{}");
        artwork.setHtmlUrl("https://preview.example/artwork/index.html");
        artwork.setStandaloneHtml("<!doctype html><title>Demo</title>");
        doReturn(artwork).when(artworkService).getById(1L);
        org.springframework.test.util.ReflectionTestUtils.setField(artworkService, "objectMapper",
                new com.fasterxml.jackson.databind.ObjectMapper());

        assertEquals("website", artworkService.getArtworkDeconstruction(1L, null, false).getDeviceFrame());
        assertEquals("https://preview.example/artwork/index.html",
                artworkService.getArtworkDeconstruction(1L, null, false).getHtmlUrl());
    }

    @Test
    @SuppressWarnings("unchecked")
    void getHomeOverviewShouldFallbackToLatestPublishedArtworksWhenNoRecentUpdates() {
        ArtworkServiceImpl artworkService = Mockito.spy(new ArtworkServiceImpl());
        Artwork fallbackArtwork = new Artwork();
        fallbackArtwork.setId(99L);
        fallbackArtwork.setTitle("Fallback Component");
        fallbackArtwork.setStatus(1);
        fallbackArtwork.setMemberOnly(0);

        Mockito.doReturn(java.util.Collections.emptyList())
                .doReturn(java.util.Collections.singletonList(fallbackArtwork))
                .when(artworkService)
                .list(Mockito.any(com.baomidou.mybatisplus.core.conditions.Wrapper.class));
        Mockito.doReturn(876L)
                .when(artworkService)
                .count(Mockito.any(com.baomidou.mybatisplus.core.conditions.Wrapper.class));
        org.springframework.test.util.ReflectionTestUtils.setField(artworkService, "categoryMapper",
                Mockito.mock(com.yupi.springbootinit.mapper.CategoryMapper.class));
        org.springframework.test.util.ReflectionTestUtils.setField(artworkService, "artworkTagMapper",
                Mockito.mock(com.yupi.springbootinit.mapper.ArtworkTagMapper.class));
        org.springframework.test.util.ReflectionTestUtils.setField(artworkService, "tagMapper",
                Mockito.mock(com.yupi.springbootinit.mapper.TagMapper.class));
        org.springframework.test.util.ReflectionTestUtils.setField(artworkService, "artworkFavoriteMapper",
                Mockito.mock(com.yupi.springbootinit.mapper.ArtworkFavoriteMapper.class));
        org.springframework.test.util.ReflectionTestUtils.setField(artworkService, "artworkAccessMapper",
                Mockito.mock(com.yupi.springbootinit.mapper.ArtworkAccessMapper.class));

        com.yupi.springbootinit.model.vo.artwork.ArtworkHomeOverviewVO overview = artworkService.getHomeOverview(null);
        assertEquals(876L, overview.getTotalCount());
        assertEquals(0L, overview.getRecentThreeDaysCount());
        assertEquals(1, overview.getRecentItems().size());
        assertEquals("Fallback Component", overview.getRecentItems().get(0).getTitle());
    }
}
