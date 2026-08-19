package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.BlogBookMapper;
import com.yupi.springbootinit.mapper.BlogCategoryMapper;
import com.yupi.springbootinit.mapper.BlogChapterMapper;
import com.yupi.springbootinit.mapper.BlogPostMapper;
import com.yupi.springbootinit.model.entity.BlogBook;
import com.yupi.springbootinit.model.entity.BlogCategory;
import com.yupi.springbootinit.model.entity.BlogChapter;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.dto.blog.BlogOutlineReorderRequest;
import com.yupi.springbootinit.model.dto.blog.BlogBookSaveRequest;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import com.yupi.springbootinit.service.impl.BlogBookServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class BlogBookServiceImplTest {

    @Mock
    private BlogBookMapper blogBookMapper;
    @Mock
    private BlogCategoryMapper blogCategoryMapper;
    @Mock
    private BlogChapterMapper blogChapterMapper;
    @Mock
    private BlogPostMapper blogPostMapper;
    @Mock
    private BlogPostService blogPostService;

    @InjectMocks
    private BlogBookServiceImpl service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "baseMapper", blogBookMapper);
    }

    @Test
    void assigningPostToChapterInheritsBookCategoryAndAppendsOrder() {
        BlogPost existing = new BlogPost();
        existing.setId(10L);
        BlogPost last = new BlogPost();
        last.setId(11L);
        last.setChapterSort(20);
        BlogChapter chapter = new BlogChapter();
        chapter.setId(30L);
        chapter.setBookId(40L);
        BlogBook book = new BlogBook();
        book.setId(40L);
        book.setCategoryId(50L);

        when(blogPostMapper.selectOne(any())).thenReturn(existing, last);
        when(blogChapterMapper.selectOne(any())).thenReturn(chapter);
        when(blogBookMapper.selectOne(any())).thenReturn(book);
        when(blogPostMapper.updateById(any(BlogPost.class))).thenReturn(1);

        service.assignPost(existing.getId(), chapter.getId());

        ArgumentCaptor<BlogPost> captor = ArgumentCaptor.forClass(BlogPost.class);
        verify(blogPostMapper).updateById(captor.capture());
        assertEquals(chapter.getId(), captor.getValue().getChapterId());
        assertEquals(book.getCategoryId(), captor.getValue().getCategoryId());
        assertEquals(30, captor.getValue().getChapterSort());
    }

    @Test
    void deletingNonEmptyChapterIsRejected() {
        BlogChapter chapter = new BlogChapter();
        chapter.setId(30L);
        chapter.setBookId(40L);
        when(blogChapterMapper.selectOne(any())).thenReturn(chapter);
        when(blogPostMapper.selectCount(any(Wrapper.class))).thenReturn(1L);

        assertThrows(BusinessException.class, () -> service.deleteChapter(chapter.getId()));
        verify(blogChapterMapper, never()).deleteById(chapter.getId());
    }

    @Test
    void reorderingOutlineCanMovePostsBetweenChapters() {
        BlogBook book = new BlogBook();
        book.setId(40L);
        BlogChapter first = chapter(30L, book.getId());
        BlogChapter second = chapter(31L, book.getId());
        BlogPost firstPost = post(10L, first.getId());
        BlogPost secondPost = post(11L, second.getId());
        when(blogBookMapper.selectOne(any())).thenReturn(book);
        when(blogChapterMapper.selectList(any())).thenReturn(Arrays.asList(first, second));
        when(blogPostMapper.selectList(any())).thenReturn(Arrays.asList(firstPost, secondPost));
        when(blogChapterMapper.updateById(any(BlogChapter.class))).thenReturn(1);
        when(blogPostMapper.updateById(any(BlogPost.class))).thenReturn(1);

        BlogOutlineReorderRequest request = new BlogOutlineReorderRequest();
        request.setBookId(book.getId());
        request.setChapters(Arrays.asList(
                order(second.getId(), Collections.singletonList(firstPost.getId())),
                order(first.getId(), Collections.singletonList(secondPost.getId()))));

        service.reorderOutline(request);

        ArgumentCaptor<BlogPost> postCaptor = ArgumentCaptor.forClass(BlogPost.class);
        verify(blogPostMapper, times(2)).updateById(postCaptor.capture());
        List<BlogPost> updates = postCaptor.getAllValues();
        assertEquals(second.getId(), updates.get(0).getChapterId());
        assertEquals(firstPost.getId(), updates.get(0).getId());
        assertEquals(first.getId(), updates.get(1).getChapterId());
        assertEquals(secondPost.getId(), updates.get(1).getId());
    }

    @Test
    void savingBookSanitizesRichIntroductionAndDerivesPlainSummary() {
        BlogBook existing = new BlogBook();
        existing.setId(40L);
        existing.setCategoryId(50L);
        BlogCategory category = new BlogCategory();
        category.setId(50L);
        category.setStatus("enabled");
        BlogBookSaveRequest request = new BlogBookSaveRequest();
        request.setId(existing.getId());
        request.setCategoryId(category.getId());
        request.setTitle("智能体入门");
        request.setSlug("agent-basics");
        request.setStatus("enabled");
        request.setIntroductionHtml("<h2>课程介绍，</h2><p><span style=\"color: rgb(22, 119, 255)\">"
                + "从零开始</span></p><script>alert(1)</script>");

        when(blogCategoryMapper.selectById(category.getId())).thenReturn(category);
        when(blogBookMapper.selectCount(any())).thenReturn(0L);
        when(blogBookMapper.selectOne(any())).thenReturn(existing);
        when(blogBookMapper.updateById(any(BlogBook.class))).thenReturn(1);

        service.saveBook(request, null);

        ArgumentCaptor<BlogBook> captor = ArgumentCaptor.forClass(BlogBook.class);
        verify(blogBookMapper).updateById(captor.capture());
        BlogBook saved = captor.getValue();
        assertTrue(saved.getIntroductionHtml().contains("color: rgb(22, 119, 255)"));
        assertFalse(saved.getIntroductionHtml().contains("script"));
        assertEquals("课程介绍， 从零开始", saved.getSummary());
    }

    private BlogChapter chapter(Long id, Long bookId) {
        BlogChapter chapter = new BlogChapter();
        chapter.setId(id);
        chapter.setBookId(bookId);
        return chapter;
    }

    private BlogPost post(Long id, Long chapterId) {
        BlogPost post = new BlogPost();
        post.setId(id);
        post.setChapterId(chapterId);
        return post;
    }

    private BlogOutlineReorderRequest.ChapterOrderItem order(Long chapterId, List<Long> postIds) {
        BlogOutlineReorderRequest.ChapterOrderItem item = new BlogOutlineReorderRequest.ChapterOrderItem();
        item.setChapterId(chapterId);
        item.setPostIds(postIds);
        return item;
    }
}
