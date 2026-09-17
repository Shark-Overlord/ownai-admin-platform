package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.ArtworkMapper;
import com.yupi.springbootinit.mapper.DeconstructionAssetFavoriteMapper;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteAddRequest;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteCancelRequest;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteQueryRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.DeconstructionAssetFavorite;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.DeconstructionAssetFavoriteVO;
import com.yupi.springbootinit.service.impl.DeconstructionAssetFavoriteServiceImpl;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DeconstructionAssetFavoriteServiceImplTest {

    @Mock
    private DeconstructionAssetFavoriteMapper favoriteMapper;

    @Mock
    private ArtworkMapper artworkMapper;

    @InjectMocks
    private DeconstructionAssetFavoriteServiceImpl service;

    private User loginUser;

    @BeforeEach
    void setUp() {
        loginUser = new User();
        loginUser.setId(1001L);
        loginUser.setUserName("testUser");
    }

    @Test
    void addFavorite_successNewRecord() {
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setIsDelete(0);
        when(artworkMapper.selectById(1L)).thenReturn(artwork);
        when(favoriteMapper.selectIncludingDeleted(1001L, 1L, "component", "navbar")).thenReturn(null);
        when(favoriteMapper.insert(any(DeconstructionAssetFavorite.class))).thenReturn(1);

        DeconstructionAssetFavoriteAddRequest request = new DeconstructionAssetFavoriteAddRequest();
        request.setArtworkId(1L);
        request.setAssetType("component");
        request.setAssetKey("navbar");
        request.setTitle("导航栏");
        request.setContent("<nav>header</nav>");

        Boolean result = service.addFavorite(request, loginUser);
        assertTrue(result);
        verify(favoriteMapper).insert(any(DeconstructionAssetFavorite.class));
    }

    @Test
    void addFavorite_idempotentWhenAlreadyFavorited() {
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setIsDelete(0);
        when(artworkMapper.selectById(1L)).thenReturn(artwork);

        DeconstructionAssetFavorite existing = new DeconstructionAssetFavorite();
        existing.setId(10L);
        existing.setIsDelete(0);
        when(favoriteMapper.selectIncludingDeleted(1001L, 1L, "prompt", "full")).thenReturn(existing);

        DeconstructionAssetFavoriteAddRequest request = new DeconstructionAssetFavoriteAddRequest();
        request.setArtworkId(1L);
        request.setAssetType("prompt");
        request.setAssetKey("full");
        request.setTitle("Prompt");
        request.setContent("# SYSTEM");

        Boolean result = service.addFavorite(request, loginUser);
        assertTrue(result);
    }

    @Test
    void addFavorite_restoreWhenSoftDeleted() {
        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setIsDelete(0);
        when(artworkMapper.selectById(1L)).thenReturn(artwork);

        DeconstructionAssetFavorite existing = new DeconstructionAssetFavorite();
        existing.setId(10L);
        existing.setIsDelete(1);
        when(favoriteMapper.selectIncludingDeleted(1001L, 1L, "icon", "search")).thenReturn(existing);
        when(favoriteMapper.updateById(any(DeconstructionAssetFavorite.class))).thenReturn(1);

        DeconstructionAssetFavoriteAddRequest request = new DeconstructionAssetFavoriteAddRequest();
        request.setArtworkId(1L);
        request.setAssetType("icon");
        request.setAssetKey("search");
        request.setTitle("Search Icon");
        request.setContent("<svg>search</svg>");

        Boolean result = service.addFavorite(request, loginUser);
        assertTrue(result);
        assertEquals(0, existing.getIsDelete());
        verify(favoriteMapper).updateById(existing);
    }

    @Test
    void addFavorite_rejectsInvalidParamsOrNotFound() {
        assertThrows(BusinessException.class, () -> service.addFavorite(null, loginUser));

        DeconstructionAssetFavoriteAddRequest req = new DeconstructionAssetFavoriteAddRequest();
        req.setArtworkId(1L);
        req.setAssetType("unsupported_type");
        req.setAssetKey("key1");
        req.setContent("content");
        assertThrows(BusinessException.class, () -> service.addFavorite(req, loginUser));

        req.setAssetType("prompt");
        when(artworkMapper.selectById(1L)).thenReturn(null);
        assertThrows(BusinessException.class, () -> service.addFavorite(req, loginUser));
    }

    @Test
    void cancelFavorite_success() {
        when(favoriteMapper.update(any(), any())).thenReturn(1);

        DeconstructionAssetFavoriteCancelRequest request = new DeconstructionAssetFavoriteCancelRequest();
        request.setArtworkId(1L);
        request.setAssetType("component");
        request.setAssetKey("navbar");

        Boolean result = service.cancelFavorite(request, loginUser);
        assertTrue(result);
    }

    @Test
    void listFavoritedKeys_success() {
        DeconstructionAssetFavorite fav1 = new DeconstructionAssetFavorite();
        fav1.setAssetType("prompt");
        fav1.setAssetKey("full");

        DeconstructionAssetFavorite fav2 = new DeconstructionAssetFavorite();
        fav2.setAssetType("component");
        fav2.setAssetKey("hero");

        when(favoriteMapper.selectList(any())).thenReturn(Arrays.asList(fav1, fav2));

        List<String> keys = service.listFavoritedKeys(1L, loginUser);
        assertEquals(2, keys.size());
        assertTrue(keys.contains("prompt:full"));
        assertTrue(keys.contains("component:hero"));
    }

    @Test
    void listMyFavoritesByPage_success() {
        DeconstructionAssetFavorite fav = new DeconstructionAssetFavorite();
        fav.setId(10L);
        fav.setArtworkId(1L);
        fav.setAssetType("component");
        fav.setAssetKey("navbar");
        fav.setTitle("导航栏");

        Page<DeconstructionAssetFavorite> entityPage = new Page<>(1, 10, 1);
        entityPage.setRecords(Collections.singletonList(fav));
        when(favoriteMapper.selectPage(any(), any())).thenReturn(entityPage);

        Artwork artwork = new Artwork();
        artwork.setId(1L);
        artwork.setTitle("OwnAI 官网原型");
        when(artworkMapper.selectBatchIds(any())).thenReturn(Collections.singletonList(artwork));

        DeconstructionAssetFavoriteQueryRequest queryRequest = new DeconstructionAssetFavoriteQueryRequest();
        queryRequest.setCurrent(1);
        queryRequest.setPageSize(10);

        Page<DeconstructionAssetFavoriteVO> result = service.listMyFavoritesByPage(queryRequest, loginUser);
        assertEquals(1, result.getTotal());
        assertEquals("OwnAI 官网原型", result.getRecords().get(0).getArtworkTitle());
    }

    @Test
    void listFavoritesForMcp_success() {
        DeconstructionAssetFavorite fav = new DeconstructionAssetFavorite();
        fav.setId(20L);
        fav.setUserId(1001L);
        fav.setAssetType("icon");
        fav.setAssetKey("lucide-copy");

        when(favoriteMapper.selectList(any())).thenReturn(Collections.singletonList(fav));

        List<DeconstructionAssetFavorite> list = service.listFavoritesForMcp(1001L, "icon", "copy", 10);
        assertNotNull(list);
        assertEquals(1, list.size());
    }
}