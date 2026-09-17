package com.yupi.springbootinit.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;

import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.manager.CosManager;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

class ArtworkHtmlUploadTest {

    private ArtworkController controller;
    private final Map<String, byte[]> uploadedObjects = new HashMap<>();

    @BeforeEach
    void setUp() {
        controller = new ArtworkController();
        CosManager cosManager = mock(CosManager.class);
        CosClientConfig cosClientConfig = new CosClientConfig();
        cosClientConfig.setHost("https://files.example.com");
        ReflectionTestUtils.setField(controller, "cosManager", cosManager);
        ReflectionTestUtils.setField(controller, "cosClientConfig", cosClientConfig);
        doAnswer(invocation -> {
            String key = invocation.getArgument(0);
            File file = invocation.getArgument(1);
            uploadedObjects.put(key, Files.readAllBytes(file.toPath()));
            return null;
        }).when(cosManager).putObject(anyString(), any(File.class), anyString());
    }

    @Test
    void uploadsStandaloneHtmlWithBridgedPreviewAndPristineSourceArchive() throws Exception {
        String original = "<!doctype html><html><body><main>独立页面</main></body></html>";
        MockMultipartFile file = new MockMultipartFile("file", "standalone.html", "text/html",
                original.getBytes(StandardCharsets.UTF_8));

        BaseResponse<Map<String, String>> response = controller.uploadStandaloneHtml(file);

        assertEquals(0, response.getCode());
        assertTrue(response.getData().get("htmlUrl").matches(
                "https://files\\.example\\.com/artwork/html/[a-f0-9]{32}/index\\.html"));
        assertTrue(response.getData().get("sourceZipUrl").matches(
                "https://files\\.example\\.com/artwork/source/[a-f0-9]{32}\\.zip"));

        Map.Entry<String, byte[]> preview = uploadedObjects.entrySet().stream()
                .filter(entry -> entry.getKey().endsWith("/index.html"))
                .findFirst().orElse(null);
        assertNotNull(preview);
        String hostedHtml = new String(preview.getValue(), StandardCharsets.UTF_8);
        assertTrue(hostedHtml.contains("data-ownai-preview-bridge"));
        assertTrue(hostedHtml.contains("HIGHLIGHT_PART"));

        Map.Entry<String, byte[]> source = uploadedObjects.entrySet().stream()
                .filter(entry -> entry.getKey().endsWith(".zip"))
                .findFirst().orElse(null);
        assertNotNull(source);
        try (ZipInputStream input = new ZipInputStream(new ByteArrayInputStream(source.getValue()))) {
            ZipEntry entry = input.getNextEntry();
            assertNotNull(entry);
            assertEquals("index.html", entry.getName());
            ByteArrayOutputStream archived = new ByteArrayOutputStream();
            byte[] buffer = new byte[1024];
            int length;
            while ((length = input.read(buffer)) != -1) {
                archived.write(buffer, 0, length);
            }
            String archivedHtml = new String(archived.toByteArray(), StandardCharsets.UTF_8);
            assertEquals(original, archivedHtml);
            assertFalse(archivedHtml.contains("data-ownai-preview-bridge"));
        }
    }

    @Test
    void rejectsZipUploads() {
        MockMultipartFile file = new MockMultipartFile("file", "standalone.zip", "application/zip",
                new byte[] {1, 2, 3});

        BusinessException exception = assertThrows(BusinessException.class,
                () -> controller.uploadStandaloneHtml(file));

        assertEquals("仅支持 HTML 文件", exception.getMessage());
    }
}
