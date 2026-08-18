package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertThrows;

import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.service.impl.BlogPostServiceImpl;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

class BlogPostServiceImplTest {

    private final BlogPostServiceImpl service = new BlogPostServiceImpl();

    @Test
    void batchDeleteRequiresAtLeastOnePost() {
        assertThrows(BusinessException.class, () -> service.batchDeletePosts(Collections.emptyList()));
    }

    @Test
    void batchPublishRejectsDuplicateIds() {
        assertThrows(BusinessException.class, () -> service.batchPublishPosts(Arrays.asList(1L, 1L), null));
    }

    @Test
    void batchDeleteLimitsEachRequestToOneHundredPosts() {
        List<Long> ids = LongStream.rangeClosed(1, 101).boxed().collect(Collectors.toList());
        assertThrows(BusinessException.class, () -> service.batchDeletePosts(ids));
    }

    @Test
    void batchMemberOnlyRejectsUnsupportedFlag() {
        assertThrows(BusinessException.class, () -> service.batchSetMemberOnly(Collections.singletonList(1L), 2));
    }
}
