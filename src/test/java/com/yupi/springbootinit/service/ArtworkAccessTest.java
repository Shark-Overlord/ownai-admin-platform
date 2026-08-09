package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.doReturn;

import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.service.impl.ArtworkServiceImpl;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

class ArtworkAccessTest {

    @Test
    void adminWithNormalMemberLevelShouldNotAccessMemberOnlyArtwork() {
        ArtworkServiceImpl artworkService = Mockito.spy(new ArtworkServiceImpl());
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setMemberOnly(1);
        doReturn(artwork).when(artworkService).getById(1L);

        User adminNormalUser = new User();
        adminNormalUser.setId(10L);
        adminNormalUser.setUserRole(UserConstant.ADMIN_ROLE);
        adminNormalUser.setMemberLevel(MemberLevelEnum.NORMAL.getValue());

        assertFalse(artworkService.hasArtworkAccess(1L, adminNormalUser));
    }

    @Test
    void paidMemberShouldAccessMemberOnlyArtwork() {
        ArtworkServiceImpl artworkService = Mockito.spy(new ArtworkServiceImpl());
        Artwork artwork = new Artwork();
        artwork.setId(1L);
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
        artwork.setMemberOnly(0);
        doReturn(artwork).when(artworkService).getById(1L);

        assertTrue(artworkService.hasArtworkAccess(1L, null));
    }
}
