package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.yupi.springbootinit.exception.BusinessException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class RemoteImageImportServiceTest {

    private final RemoteImageImportService service = new RemoteImageImportService();

    @Test
    void acceptsOnlyHttpsUrisWithoutCredentials() {
        assertDoesNotThrow(() -> service.parseAndValidateUri("https://cdn.example.com/path/image.png?token=1"));
        assertThrows(BusinessException.class, () -> service.parseAndValidateUri("http://cdn.example.com/image.png"));
        assertThrows(BusinessException.class, () -> service.parseAndValidateUri("file:///etc/passwd"));
        assertThrows(BusinessException.class, () -> service.parseAndValidateUri("https://user:pass@example.com/image.png"));
    }

    @Test
    void rejectsLoopbackAndPrivateNetworkAddresses() {
        assertThrows(BusinessException.class, () -> service.validatePublicHost("127.0.0.1"));
        assertThrows(BusinessException.class, () -> service.validatePublicHost("10.0.0.1"));
        assertThrows(BusinessException.class, () -> service.validatePublicHost("192.168.1.1"));
        assertThrows(BusinessException.class, () -> service.validatePublicHost("::1"));
        assertThrows(BusinessException.class, () -> service.validatePublicHost("fc00::1"));
    }

    @Test
    void rejectsMoreThanFiftyUniqueImages() {
        List<String> urls = new ArrayList<>();
        for (int index = 0; index < 51; index++) {
            urls.add("https://cdn.example.com/" + index + ".png");
        }
        assertThrows(BusinessException.class, () -> service.importImages(urls, 1L));
    }
}
