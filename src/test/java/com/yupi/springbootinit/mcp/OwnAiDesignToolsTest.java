package com.yupi.springbootinit.mcp;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.DeconstructionAssetFavorite;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.service.ArtworkService;
import com.yupi.springbootinit.service.DeconstructionAssetFavoriteService;
import com.yupi.springbootinit.service.PromptAssetService;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
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
class OwnAiDesignToolsTest {

    @Mock
    private DeconstructionAssetFavoriteService favoriteService;

    @Mock
    private ArtworkService artworkService;

    @Mock
    private PromptAssetService promptAssetService;

    @InjectMocks
    private OwnAiDesignTools tools;

    private User testUser;
    private Artwork sampleArtwork;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(100L);
        testUser.setMemberLevel("member");
        McpUserContext.set(testUser);

        sampleArtwork = new Artwork();
        sampleArtwork.setId(2083L);
        sampleArtwork.setTitle("Claude iOS 聊天客户端");
        sampleArtwork.setDeviceFrame("iphone");
        sampleArtwork.setSummary("高质感移动端社交聊天设计");
        sampleArtwork.setIsDeconstructed(1);
        sampleArtwork.setStatus(1);
        sampleArtwork.setPromptData("{\"motions\":[{\"label\":\"灵动岛弹簧\",\"desc\":\"胶囊展开\",\"token\":\"cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.28s\"}],\"colors\":{\"primary\":\"#d97706\",\"background\":\"#0f1013\"}}");
        sampleArtwork.setPartsData("[{\"id\":\"status-bar\",\"title\":\"iOS 状态栏与灵动岛\",\"tag\":\"StatusBar\",\"code\":\"export const StatusBar = () => <header className=\\\"h-11 flex\\\" />\",\"desc\":\"顶部信号电量与动态弹簧胶囊\"}]");
        sampleArtwork.setStandaloneHtml("<!DOCTYPE html><html><body><div id='root'>Claude Chat App</div></body></html>");
        sampleArtwork.setDeconstructedPrompt("Design System: Dark minimal chat UI");

        when(artworkService.getById(2083L)).thenReturn(sampleArtwork);
        when(artworkService.listByIds(any())).thenReturn(List.of(sampleArtwork));
        when(artworkService.getOne(any())).thenReturn(sampleArtwork);
        when(artworkService.list(any(QueryWrapper.class))).thenReturn(List.of(sampleArtwork));

        ArtworkVO vo = new ArtworkVO();
        vo.setId(2083L);
        vo.setTitle("Claude iOS 聊天客户端");
        vo.setDeviceFrame("iphone");
        vo.setSummary("高质感移动端社交聊天设计");
        vo.setIsDeconstructed(1);
        Page<ArtworkVO> voPage = new Page<>(1, 5, 1);
        voPage.setRecords(List.of(vo));
        when(artworkService.listArtworkVOByPage(any(), any(), anyBoolean())).thenReturn(voPage);
    }

    @AfterEach
    void tearDown() {
        McpUserContext.clear();
    }

    @Test
    void find_design_components_withSemanticFilter_returnsMatchedComponents() {
        DeconstructionAssetFavorite fav = new DeconstructionAssetFavorite();
        fav.setId(1L);
        fav.setUserId(100L);
        fav.setArtworkId(2083L);
        fav.setAssetKey("status-bar");
        fav.setTitle("iOS 状态栏与灵动岛");
        fav.setTag("StatusBar");
        fav.setDescription("顶部信号电量与动态弹簧胶囊");
        fav.setContent("export const StatusBar = () => <header className=\"h-11 flex\" />");

        when(favoriteService.listFavoritesForMcp(100L, "component", null, 50))
                .thenReturn(List.of(fav));

        List<OwnAiDesignTools.DesignComponentResult> results = tools.find_design_components(
                "社交", "app", "暗黑", "状态栏", "spring", null, true, "all", 5
        );

        assertNotNull(results);
        assertFalse(results.isEmpty());
        OwnAiDesignTools.DesignComponentResult first = results.get(0);
        assertNotNull(first.title());
        assertTrue(first.title().contains("iOS"));
        assertEquals("app", first.device());
        assertTrue(first.code().contains("StatusBar"));
        assertNotNull(first.matchedMotions());
        assertFalse(first.matchedMotions().isEmpty());
    }

    @Test
    void get_design_system_returnsColorsAndMotionTokens() {
        OwnAiDesignTools.DesignSystemSpec spec = tools.get_design_system(
                "社交", "app", "暗黑", "Claude"
        );

        assertNotNull(spec);
        assertNotNull(spec.title());
        assertTrue(spec.title().contains("Claude"));
        assertEquals("app", spec.device());
        assertNotNull(spec.colorPalette());
        assertTrue(spec.colorPalette().containsKey("primary"));
        assertNotNull(spec.motionTokens());
        assertFalse(spec.motionTokens().isEmpty());
    }

    @Test
    void find_motion_presets_returnsFramerMotionAndTailwindSnippets() {
        List<OwnAiDesignTools.MotionPresetResult> presets = tools.find_motion_presets(
                "灵动岛弹簧展开", "framer-motion", "app"
        );

        assertNotNull(presets);
        assertFalse(presets.isEmpty());
        OwnAiDesignTools.MotionPresetResult first = presets.get(0);
        assertNotNull(first.framerMotionSnippet());
        assertNotNull(first.tailwindSnippet());
        assertNotNull(first.cssBezier());
    }

    @Test
    void find_design_artworks_withExclusion_deduplicatesAndPaginates() {
        List<OwnAiDesignTools.ArtworkSearchResult> results = tools.find_design_artworks(
                "社交", "app", "暗黑", null, 1, "Claude iOS 聊天客户端", 5
        );
        assertNotNull(results);
        assertTrue(results.isEmpty()); // 命中排除列表，成功过滤
    }

    @Test
    void get_artwork_code_returnsStandaloneHtmlAndComponentSnippets() {
        OwnAiDesignTools.ArtworkCodeResult codeResult = tools.get_artwork_code("Claude", "all");
        assertNotNull(codeResult);
        assertEquals("Claude iOS 聊天客户端", codeResult.title());
        assertNotNull(codeResult.prototypeHtml());
        assertTrue(codeResult.prototypeHtml().contains("Claude Chat App"));
        assertNotNull(codeResult.components());
        assertFalse(codeResult.components().isEmpty());
        assertEquals("StatusBar", codeResult.components().get(0).tag());
        assertNotNull(codeResult.designSpec());
    }
}
