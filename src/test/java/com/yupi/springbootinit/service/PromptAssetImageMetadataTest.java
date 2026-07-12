package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import com.yupi.springbootinit.model.entity.PromptAssetMedia;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetVO;
import com.yupi.springbootinit.service.impl.PromptAssetServiceImpl;
import java.util.Collections;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class PromptAssetImageMetadataTest {

    @Test
    void shouldKeepLandscapeDimensionsInOriginalOrder() {
        PromptAssetVO vo = buildVO("https://example.com/landscape.jpg");
        PromptAssetMedia media = buildMedia(vo.getPreviewMediaUrl(), 1200, 896);

        fill(vo, media);

        assertEquals(1200, vo.getImageWidth());
        assertEquals(896, vo.getImageHeight());
        assertEquals(1200D / 896D, vo.getImageAspectRatio(), 0.000001D);
    }

    @Test
    void shouldKeepPortraitDimensionsInOriginalOrder() {
        PromptAssetVO vo = buildVO("https://example.com/portrait.jpg");
        PromptAssetMedia media = buildMedia(vo.getPreviewMediaUrl(), 896, 1199);

        fill(vo, media);

        assertEquals(896, vo.getImageWidth());
        assertEquals(1199, vo.getImageHeight());
        assertEquals(896D / 1199D, vo.getImageAspectRatio(), 0.000001D);
    }

    @Test
    void shouldNotUseThumbnailDimensionsForDisplayedOriginal() {
        PromptAssetVO vo = buildVO("https://example.com/original.jpg");
        PromptAssetMedia media = buildMedia("https://example.com/other.jpg", 320, 180);
        media.setThumbnailCloudUrl(vo.getPreviewMediaUrl());

        fill(vo, media);

        assertNull(vo.getImageWidth());
        assertNull(vo.getImageHeight());
        assertNull(vo.getImageAspectRatio());
    }

    private PromptAssetVO buildVO(String previewMediaUrl) {
        PromptAssetVO vo = new PromptAssetVO();
        vo.setPreviewMediaUrl(previewMediaUrl);
        vo.setCoverUrl(previewMediaUrl);
        return vo;
    }

    private PromptAssetMedia buildMedia(String cloudUrl, int width, int height) {
        PromptAssetMedia media = new PromptAssetMedia();
        media.setCloudUrl(cloudUrl);
        media.setWidth(width);
        media.setHeight(height);
        return media;
    }

    private void fill(PromptAssetVO vo, PromptAssetMedia media) {
        PromptAssetServiceImpl service = new PromptAssetServiceImpl();
        ReflectionTestUtils.invokeMethod(
                service,
                "fillDisplayedImageMetadata",
                vo,
                Collections.singletonList(media));
    }
}
