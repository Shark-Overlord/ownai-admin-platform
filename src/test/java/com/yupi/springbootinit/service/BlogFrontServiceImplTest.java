package com.yupi.springbootinit.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.BlogBookMapper;
import com.yupi.springbootinit.mapper.BlogBookFavoriteMapper;
import com.yupi.springbootinit.mapper.BlogCategoryMapper;
import com.yupi.springbootinit.mapper.BlogChapterMapper;
import com.yupi.springbootinit.mapper.BlogPostMapper;
import com.yupi.springbootinit.mapper.BlogPostFavoriteMapper;
import com.yupi.springbootinit.mapper.BlogPostTagMapper;
import com.yupi.springbootinit.mapper.BlogTagMapper;
import com.yupi.springbootinit.model.dto.blog.BlogFrontBookQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogFrontPostQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostReadTrackRequest;
import com.yupi.springbootinit.model.entity.BlogCategory;
import com.yupi.springbootinit.model.entity.BlogBook;
import com.yupi.springbootinit.model.entity.BlogChapter;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.entity.BlogPostFavorite;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.blog.BlogFavoriteCountVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostDetailVO;
import com.yupi.springbootinit.service.impl.BlogFrontServiceImpl;
import java.util.Collections;
import java.util.Date;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;

@ExtendWith(MockitoExtension.class)
class BlogFrontServiceImplTest {

    @Mock
    private BlogBookMapper blogBookMapper;
    @Mock
    private BlogBookFavoriteMapper blogBookFavoriteMapper;
    @Mock
    private BlogChapterMapper blogChapterMapper;
    @Mock
    private BlogPostMapper blogPostMapper;
    @Mock
    private BlogPostFavoriteMapper blogPostFavoriteMapper;
    @Mock
    private BlogCategoryMapper blogCategoryMapper;
    @Mock
    private BlogTagMapper blogTagMapper;
    @Mock
    private BlogPostTagMapper blogPostTagMapper;
    @Mock
    private JdbcTemplate jdbcTemplate;

    @InjectMocks
    private BlogFrontServiceImpl service;

    @Test
    void bookPageRejectsUnknownAccessTypeBeforeQueryingDatabase() {
        BlogFrontBookQueryRequest request = new BlogFrontBookQueryRequest();
        request.setAccessType("vip");

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.listBooks(request, null));

        assertEquals(ErrorCode.PARAMS_ERROR.getCode(), exception.getCode());
        verify(blogBookMapper, never()).selectPage(any(), any());
    }

    @Test
    void postPageRejectsInvalidMemberFlag() {
        BlogFrontPostQueryRequest request = new BlogFrontPostQueryRequest();
        request.setMemberOnly(2);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.listPosts(request, null));

        assertEquals(ErrorCode.PARAMS_ERROR.getCode(), exception.getCode());
        verify(blogPostMapper, never()).selectPage(any(), any());
    }

    @Test
    void frontPageSizeIsLimitedToTwenty() {
        BlogFrontPostQueryRequest request = new BlogFrontPostQueryRequest();
        request.setPageSize(21);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.listPosts(request, null));

        assertEquals(ErrorCode.PARAMS_ERROR.getCode(), exception.getCode());
    }

    @Test
    void anonymousUserCannotReadLoginOnlyPost() {
        BlogPost post = publishedPost(11L, 0, "login");
        when(blogPostMapper.selectOne(any())).thenReturn(post);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.getPost(post.getId(), null));

        assertEquals(ErrorCode.NOT_LOGIN_ERROR.getCode(), exception.getCode());
        verify(blogCategoryMapper, never()).selectOne(any());
        verify(blogPostMapper, never()).update(nullable(BlogPost.class), any(Wrapper.class));
    }

    @Test
    void anonymousUserSeesMemberPostMetadataButCannotReadItsBody() {
        BlogPost post = publishedPost(12L, 1, "public");
        BlogCategory category = enabledCategory();
        when(blogPostMapper.selectOne(any())).thenReturn(post);
        when(blogCategoryMapper.selectOne(any())).thenReturn(category);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.getPost(post.getId(), null));

        assertEquals(ErrorCode.FORBIDDEN_ERROR.getCode(), exception.getCode());
        verify(blogPostMapper, never()).update(nullable(BlogPost.class), any(Wrapper.class));
    }

    @Test
    void freeTutorialCanStillContainMemberOnlyPost() {
        BlogPost post = publishedPost(16L, 1, "public");
        post.setChapterId(31L);
        BlogChapter chapter = chapter(31L, 41L);
        BlogBook book = book(41L, 0);
        when(blogPostMapper.selectOne(any())).thenReturn(post);
        when(blogChapterMapper.selectOne(any())).thenReturn(chapter);
        when(blogBookMapper.selectOne(any())).thenReturn(book);
        when(blogCategoryMapper.selectOne(any())).thenReturn(enabledCategory());

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.getPost(post.getId(), null));

        assertEquals(ErrorCode.FORBIDDEN_ERROR.getCode(), exception.getCode());
        verify(blogPostMapper, never()).update(nullable(BlogPost.class), any(Wrapper.class));
    }

    @Test
    void memberOnlyTutorialLocksEvenAFreePost() {
        BlogPost post = publishedPost(17L, 0, "public");
        post.setChapterId(32L);
        BlogChapter chapter = chapter(32L, 42L);
        BlogBook book = book(42L, 1);
        when(blogPostMapper.selectOne(any())).thenReturn(post);
        when(blogChapterMapper.selectOne(any())).thenReturn(chapter);
        when(blogBookMapper.selectOne(any())).thenReturn(book);
        when(blogCategoryMapper.selectOne(any())).thenReturn(enabledCategory());

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.getPost(post.getId(), null));

        assertEquals(ErrorCode.FORBIDDEN_ERROR.getCode(), exception.getCode());
        verify(blogPostMapper, never()).update(nullable(BlogPost.class), any(Wrapper.class));
    }

    @Test
    void freePostDetailReturnsPublicFieldsWithoutCountingARead() {
        BlogPost post = publishedPost(13L, 0, "public");
        BlogCategory category = enabledCategory();
        when(blogPostMapper.selectOne(any())).thenReturn(post);
        when(blogCategoryMapper.selectOne(any())).thenReturn(category);
        when(blogCategoryMapper.selectById(category.getId())).thenReturn(category);
        when(blogPostTagMapper.selectList(any())).thenReturn(Collections.emptyList());

        BlogFrontPostDetailVO result = service.getPost(post.getId(), null);

        assertEquals(post.getId(), result.getId());
        assertEquals("<p>public body</p>", result.getContentHtml());
        assertEquals(0L, result.getReadCount());
        assertEquals(0L, result.getUniqueReaderCount());
        assertTrue(result.getCanAccess());
        assertEquals(category.getSlug(), result.getCategory().getSlug());
        assertFalse(result.getTags().iterator().hasNext());
        verify(blogPostMapper, never()).update(nullable(BlogPost.class), any(Wrapper.class));
    }

    @Test
    void effectiveReadRejectsAReportedDurationBelowTenSeconds() {
        BlogPostReadTrackRequest request = new BlogPostReadTrackRequest();
        request.setPostId(13L);
        request.setVisitorId("reader-visitor-123456");
        request.setDurationSeconds(9);

        BusinessException exception = assertThrows(BusinessException.class,
                () -> service.trackPostRead(request, null));

        assertEquals(ErrorCode.PARAMS_ERROR.getCode(), exception.getCode());
        verify(blogPostMapper, never()).selectOne(any());
    }

    @Test
    void addingAnExistingPostFavoriteIsIdempotent() {
        BlogPost post = publishedPost(14L, 0, "public");
        User user = loginUser();
        BlogPostFavorite existing = new BlogPostFavorite();
        existing.setUserId(user.getId());
        existing.setPostId(post.getId());
        existing.setIsDelete(0);
        when(blogPostMapper.selectOne(any())).thenReturn(post);
        when(blogPostFavoriteMapper.selectByUserAndPostIncludingDeleted(user.getId(), post.getId()))
                .thenReturn(existing);

        assertTrue(service.addPostFavorite(post.getId(), user));

        verify(blogPostFavoriteMapper, never()).insert(any());
    }

    @Test
    void loggedInPostDetailIncludesFavoriteStateAndCount() {
        BlogPost post = publishedPost(15L, 0, "public");
        BlogCategory category = enabledCategory();
        User user = loginUser();
        BlogFavoriteCountVO count = new BlogFavoriteCountVO();
        count.setTargetId(post.getId());
        count.setFavoriteCount(3);
        BlogPostFavorite mine = new BlogPostFavorite();
        mine.setUserId(user.getId());
        mine.setPostId(post.getId());
        mine.setIsDelete(0);
        when(blogPostMapper.selectOne(any())).thenReturn(post);
        when(blogCategoryMapper.selectOne(any())).thenReturn(category);
        when(blogCategoryMapper.selectById(category.getId())).thenReturn(category);
        when(blogPostTagMapper.selectList(any())).thenReturn(Collections.emptyList());
        when(blogPostFavoriteMapper.countByPostIds(any())).thenReturn(Collections.singletonList(count));
        when(blogPostFavoriteMapper.selectList(any())).thenReturn(Collections.singletonList(mine));

        BlogFrontPostDetailVO result = service.getPost(post.getId(), user);

        assertTrue(result.getFavorited());
        assertEquals(3, result.getFavoriteCount());
    }

    private BlogPost publishedPost(Long id, int memberOnly, String visibility) {
        BlogPost post = new BlogPost();
        post.setId(id);
        post.setCategoryId(21L);
        post.setTitle("Post " + id);
        post.setSlug("post-" + id);
        post.setContentJson("{\"privateEditorState\":true}");
        post.setContentHtml("<p>public body</p>");
        post.setContentSchemaVersion(1);
        post.setStatus("published");
        post.setVisibility(visibility);
        post.setMemberOnly(memberOnly);
        post.setPublishedAt(new Date(System.currentTimeMillis() - 1_000));
        post.setIsDelete(0);
        return post;
    }

    private BlogCategory enabledCategory() {
        BlogCategory category = new BlogCategory();
        category.setId(21L);
        category.setName("Java");
        category.setSlug("java");
        category.setStatus("enabled");
        category.setIsDelete(0);
        return category;
    }

    private User loginUser() {
        User user = new User();
        user.setId(1001L);
        user.setUserRole("user");
        return user;
    }

    private BlogChapter chapter(Long id, Long bookId) {
        BlogChapter chapter = new BlogChapter();
        chapter.setId(id);
        chapter.setBookId(bookId);
        chapter.setIsDelete(0);
        return chapter;
    }

    private BlogBook book(Long id, int memberOnly) {
        BlogBook book = new BlogBook();
        book.setId(id);
        book.setMemberOnly(memberOnly);
        book.setStatus("enabled");
        book.setIsDelete(0);
        return book;
    }
}
