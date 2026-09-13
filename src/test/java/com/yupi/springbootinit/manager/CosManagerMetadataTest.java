package com.yupi.springbootinit.manager;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.qcloud.cos.COSClient;
import com.qcloud.cos.model.ObjectMetadata;
import com.qcloud.cos.model.PutObjectRequest;
import com.qcloud.cos.model.PutObjectResult;
import com.yupi.springbootinit.config.CosClientConfig;
import java.io.File;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

class CosManagerMetadataTest {

    private CosManager cosManager;

    private COSClient cosClient;

    @TempDir
    File tempDir;

    @BeforeEach
    void setUp() {
        cosManager = new CosManager();
        cosClient = mock(COSClient.class);
        CosClientConfig cosClientConfig = new CosClientConfig();
        cosClientConfig.setBucket("test-bucket");
        ReflectionTestUtils.setField(cosManager, "cosClientConfig", cosClientConfig);
        ReflectionTestUtils.setField(cosManager, "cosClient", cosClient);
        when(cosClient.putObject(any(PutObjectRequest.class))).thenReturn(new PutObjectResult());
    }

    @Test
    void videoUploadShouldUseInlineLongLivedCacheMetadata() throws Exception {
        File video = new File(tempDir, "preview.mp4");
        if (!video.createNewFile()) {
            throw new IllegalStateException("Unable to create video fixture");
        }

        cosManager.putObject("/artwork_video/1/preview.mp4", video);

        ObjectMetadata metadata = captureMetadata();
        assertEquals("video/mp4", metadata.getContentType());
        assertEquals("public, max-age=31536000, immutable", metadata.getCacheControl());
        assertEquals("inline", metadata.getContentDisposition());
    }

    @Test
    void explicitVideoContentTypeShouldUseVideoCacheMetadata() throws Exception {
        File video = new File(tempDir, "generated-preview");
        if (!video.createNewFile()) {
            throw new IllegalStateException("Unable to create video fixture");
        }

        cosManager.putObject("/generated/preview", video, "video/webm");

        ObjectMetadata metadata = captureMetadata();
        assertEquals("video/webm", metadata.getContentType());
        assertEquals("public, max-age=31536000, immutable", metadata.getCacheControl());
        assertEquals("inline", metadata.getContentDisposition());
    }

    @Test
    void nonVideoUploadShouldKeepExistingMetadataBehavior() throws Exception {
        File image = new File(tempDir, "cover.webp");
        if (!image.createNewFile()) {
            throw new IllegalStateException("Unable to create image fixture");
        }

        cosManager.putObject("/artwork_cover/1/cover.webp", image);

        ObjectMetadata metadata = captureMetadata();
        assertEquals("image/webp", metadata.getContentType());
        assertNull(metadata.getCacheControl());
        assertNull(metadata.getContentDisposition());
    }

    private ObjectMetadata captureMetadata() {
        ArgumentCaptor<PutObjectRequest> captor = ArgumentCaptor.forClass(PutObjectRequest.class);
        verify(cosClient).putObject(captor.capture());
        return captor.getValue().getMetadata();
    }
}
