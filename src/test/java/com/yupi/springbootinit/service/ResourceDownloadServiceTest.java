package com.yupi.springbootinit.service;

import com.yupi.springbootinit.config.CosClientConfig;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.User;
import java.io.*;
import java.net.HttpURLConnection;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class ResourceDownloadServiceTest {
    ResourceAnalyticsService analytics;
    ResourceDownloadService downloads;
    HttpURLConnection upstream;
    User user;
    @BeforeEach void setup() throws Exception {
        analytics=mock(ResourceAnalyticsService.class);CosClientConfig cos=new CosClientConfig();cos.setHost("https://assets.example.test");
        downloads=spy(new ResourceDownloadService(analytics,cos));upstream=mock(HttpURLConnection.class);
        doReturn(upstream).when(downloads).connect(anyString());
        when(upstream.getResponseCode()).thenReturn(200);when(upstream.getContentLengthLong()).thenReturn(4L);
        when(upstream.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[]{1,2,3,4}));
        when(analytics.startDownload(anyString(),anyLong(),any(),any())).thenReturn(100L);
        user=new User();user.setId(1L);
    }
    @Test void completedDownloadIsServerRecorded() throws Exception {
        MockHttpServletResponse response=new MockHttpServletResponse();
        downloads.download("artwork",1,null,user,()->"https://assets.example.test/a.zip","source",response);
        assertEquals(4,response.getContentAsByteArray().length);
        verify(analytics).finish(100L,4L,true,null);verify(upstream).setInstanceFollowRedirects(false);
    }
    @Test void truncatedUpstreamRetainsPartialBytes() throws Exception {
        when(upstream.getContentLengthLong()).thenReturn(8L);
        assertThrows(IOException.class,()->downloads.download("artwork",1,null,user,()->"https://assets.example.test/a.zip","source",new MockHttpServletResponse()));
        verify(analytics).finish(100L,4L,false,"transfer_interrupted");
    }
    @Test void redirectAndUntrustedUrlsCannotBypassSourceValidation() throws Exception {
        assertThrows(BusinessException.class,()->downloads.validateSource("https://assets.example.test.evil.invalid/a.zip"));
        assertThrows(BusinessException.class,()->downloads.validateSource("https://assets.example.test@127.0.0.1/a.zip"));
        assertThrows(BusinessException.class,()->downloads.validateSource("http://assets.example.test/a.zip"));
        when(upstream.getResponseCode()).thenReturn(302);
        assertThrows(BusinessException.class,()->downloads.download("artwork",1,null,user,()->"https://assets.example.test/a.zip","source",new MockHttpServletResponse()));
        verify(analytics).finish(100L,0L,false,"source_error");
    }
    @Test void deniedDownloadNeverResolvesOrReadsTheSource() {
        when(analytics.startDownload(anyString(),anyLong(),any(),any())).thenThrow(new BusinessException(com.yupi.springbootinit.common.ErrorCode.DOWNLOAD_RESTRICTED));
        assertThrows(BusinessException.class,()->downloads.download("artwork",1,null,user,()->{throw new AssertionError("source read");},"source",new MockHttpServletResponse()));
        verifyNoInteractions(upstream);
    }
}
