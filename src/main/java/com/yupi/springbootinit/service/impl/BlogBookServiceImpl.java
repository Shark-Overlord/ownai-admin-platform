package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.BlogBookMapper;
import com.yupi.springbootinit.mapper.BlogCategoryMapper;
import com.yupi.springbootinit.mapper.BlogChapterMapper;
import com.yupi.springbootinit.mapper.BlogPostMapper;
import com.yupi.springbootinit.model.dto.blog.BlogBookQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogBookSaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogChapterSaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogOutlineReorderRequest;
import com.yupi.springbootinit.model.entity.BlogBook;
import com.yupi.springbootinit.model.entity.BlogCategory;
import com.yupi.springbootinit.model.entity.BlogChapter;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.blog.BlogBookVO;
import com.yupi.springbootinit.model.vo.blog.BlogCategoryVO;
import com.yupi.springbootinit.model.vo.blog.BlogChapterVO;
import com.yupi.springbootinit.model.vo.blog.BlogPostVO;
import com.yupi.springbootinit.service.BlogBookService;
import com.yupi.springbootinit.service.BlogPostService;
import com.yupi.springbootinit.utils.BlogHtmlSanitizer;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.apache.commons.lang3.StringEscapeUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BlogBookServiceImpl extends ServiceImpl<BlogBookMapper, BlogBook> implements BlogBookService {

    private static final String STATUS_ENABLED = "enabled";
    private static final String STATUS_DISABLED = "disabled";
    private static final String POST_PUBLISHED = "published";
    private static final int MAX_INTRODUCTION_HTML_LENGTH = 500_000;

    @Resource
    private BlogCategoryMapper blogCategoryMapper;

    @Resource
    private BlogChapterMapper blogChapterMapper;

    @Resource
    private BlogPostMapper blogPostMapper;

    @Resource
    private BlogPostService blogPostService;

    @Override
    public Page<BlogBookVO> listAdminBooks(BlogBookQueryRequest request) {
        BlogBookQueryRequest safeRequest = request == null ? new BlogBookQueryRequest() : request;
        QueryWrapper<BlogBook> wrapper = buildQuery(safeRequest)
                .orderByAsc("sort").orderByDesc("updateTime").orderByDesc("id");
        Page<BlogBook> page = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), wrapper);
        Page<BlogBookVO> result = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        result.setRecords(toBookVOList(page.getRecords(), false, false, null));
        return result;
    }

    @Override
    public BlogBookVO getAdminBook(Long id) {
        return toBookVOList(Collections.singletonList(getValidBook(id)), true, false, null).get(0);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long saveBook(BlogBookSaveRequest request, User adminUser) {
        validateBookRequest(request);
        BlogBook existing = request.getId() == null ? null : getValidBook(request.getId());
        BlogBook book = existing == null ? new BlogBook() : existing;
        Long oldCategoryId = existing == null ? null : existing.getCategoryId();
        book.setCategoryId(request.getCategoryId());
        book.setTitle(request.getTitle().trim());
        book.setSlug(request.getSlug().trim().toLowerCase());
        if (request.getIntroductionHtml() != null) {
            String introductionHtml = BlogHtmlSanitizer.sanitize(request.getIntroductionHtml());
            book.setIntroductionHtml(introductionHtml);
            book.setSummary(StringUtils.left(toPlainText(introductionHtml), 1000));
        } else {
            book.setSummary(StringUtils.trimToEmpty(request.getSummary()));
            if (existing == null) {
                book.setIntroductionHtml("");
            }
        }
        book.setCoverUrl(StringUtils.trimToEmpty(request.getCoverUrl()));
        book.setSeoTitle(StringUtils.trimToEmpty(request.getSeoTitle()));
        book.setSeoDescription(StringUtils.trimToEmpty(request.getSeoDescription()));
        book.setMemberOnly(request.getMemberOnly() == null
                ? existing == null || existing.getMemberOnly() == null ? 0 : existing.getMemberOnly()
                : request.getMemberOnly());
        book.setStatus(StringUtils.defaultIfBlank(request.getStatus(), STATUS_DISABLED));
        book.setSort(request.getSort() == null ? 0 : request.getSort());
        if (existing == null) {
            book.setAuthorId(adminUser.getId());
            ThrowUtils.throwIf(!this.save(book), ErrorCode.OPERATION_ERROR);
        } else {
            ThrowUtils.throwIf(!this.updateById(book), ErrorCode.OPERATION_ERROR);
        }
        if (oldCategoryId != null && !Objects.equals(oldCategoryId, book.getCategoryId())) {
            List<Long> chapterIds = listChapterIds(book.getId());
            if (!chapterIds.isEmpty()) {
                blogPostMapper.update(null, new UpdateWrapper<BlogPost>()
                        .in("chapterId", chapterIds).eq("isDelete", 0)
                        .set("categoryId", book.getCategoryId()));
            }
        }
        return book.getId();
    }

    @Override
    public Boolean deleteBook(Long id) {
        BlogBook book = getValidBook(id);
        long chapterCount = blogChapterMapper.selectCount(new QueryWrapper<BlogChapter>()
                .eq("bookId", book.getId()).eq("isDelete", 0));
        ThrowUtils.throwIf(chapterCount > 0, ErrorCode.OPERATION_ERROR, "教程书仍有章节，不能删除");
        ThrowUtils.throwIf(!this.removeById(book.getId()), ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public Long saveChapter(BlogChapterSaveRequest request) {
        if (request == null || request.getBookId() == null || request.getBookId() <= 0
                || StringUtils.isBlank(request.getTitle()) || request.getTitle().trim().length() > 255) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "章节标题和教程书不能为空");
        }
        getValidBook(request.getBookId());
        if (request.getDescription() != null && request.getDescription().length() > 1000) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "章节说明不能超过 1000 字");
        }
        BlogChapter chapter;
        if (request.getId() == null) {
            chapter = new BlogChapter();
            chapter.setBookId(request.getBookId());
            Integer nextSort = request.getSort();
            if (nextSort == null) {
                BlogChapter last = blogChapterMapper.selectOne(new QueryWrapper<BlogChapter>()
                        .eq("bookId", request.getBookId()).eq("isDelete", 0)
                        .orderByDesc("sort").orderByDesc("id").last("LIMIT 1"));
                nextSort = last == null ? 0 : last.getSort() + 10;
            }
            chapter.setSort(nextSort);
        } else {
            chapter = getValidChapter(request.getId());
            ThrowUtils.throwIf(!Objects.equals(chapter.getBookId(), request.getBookId()),
                    ErrorCode.PARAMS_ERROR, "章节不能直接移动到其他教程书");
            if (request.getSort() != null) {
                chapter.setSort(request.getSort());
            }
        }
        chapter.setTitle(request.getTitle().trim());
        chapter.setDescription(StringUtils.trimToEmpty(request.getDescription()));
        if (request.getId() == null) {
            ThrowUtils.throwIf(blogChapterMapper.insert(chapter) <= 0, ErrorCode.OPERATION_ERROR);
        } else {
            ThrowUtils.throwIf(blogChapterMapper.updateById(chapter) <= 0, ErrorCode.OPERATION_ERROR);
        }
        return chapter.getId();
    }

    @Override
    public List<BlogChapterVO> listChapters(Long bookId) {
        QueryWrapper<BlogChapter> wrapper = new QueryWrapper<BlogChapter>()
                .eq("isDelete", 0).eq(bookId != null, "bookId", bookId)
                .orderByAsc("sort").orderByAsc("id");
        return blogChapterMapper.selectList(wrapper).stream().map(chapter -> {
            BlogChapterVO vo = new BlogChapterVO();
            BeanUtils.copyProperties(chapter, vo);
            return vo;
        }).collect(Collectors.toList());
    }

    @Override
    public Boolean deleteChapter(Long id) {
        BlogChapter chapter = getValidChapter(id);
        long postCount = blogPostMapper.selectCount(new QueryWrapper<BlogPost>()
                .eq("chapterId", chapter.getId()).eq("isDelete", 0));
        ThrowUtils.throwIf(postCount > 0, ErrorCode.OPERATION_ERROR, "章节仍有文章，不能删除");
        ThrowUtils.throwIf(blogChapterMapper.deleteById(chapter.getId()) <= 0, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean reorderOutline(BlogOutlineReorderRequest request) {
        if (request == null || request.getBookId() == null || request.getChapters() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "教程目录不能为空");
        }
        getValidBook(request.getBookId());
        List<BlogChapter> existingChapters = blogChapterMapper.selectList(new QueryWrapper<BlogChapter>()
                .eq("bookId", request.getBookId()).eq("isDelete", 0));
        Set<Long> existingChapterIds = existingChapters.stream().map(BlogChapter::getId).collect(Collectors.toSet());
        List<Long> requestedChapterIds = request.getChapters().stream()
                .map(BlogOutlineReorderRequest.ChapterOrderItem::getChapterId).collect(Collectors.toList());
        ThrowUtils.throwIf(requestedChapterIds.contains(null)
                        || requestedChapterIds.size() != new HashSet<>(requestedChapterIds).size()
                        || !existingChapterIds.equals(new HashSet<>(requestedChapterIds)),
                ErrorCode.PARAMS_ERROR, "章节目录与当前数据不一致，请刷新后重试");
        List<BlogPost> existingPosts = existingChapterIds.isEmpty() ? Collections.emptyList()
                : blogPostMapper.selectList(new QueryWrapper<BlogPost>()
                        .in("chapterId", existingChapterIds).eq("isDelete", 0));
        Set<Long> existingPostIds = existingPosts.stream().map(BlogPost::getId).collect(Collectors.toSet());
        List<Long> requestedPostIds = request.getChapters().stream()
                .flatMap(item -> item.getPostIds() == null ? java.util.stream.Stream.empty() : item.getPostIds().stream())
                .collect(Collectors.toList());
        ThrowUtils.throwIf(requestedPostIds.contains(null)
                        || requestedPostIds.size() != new HashSet<>(requestedPostIds).size()
                        || !existingPostIds.equals(new HashSet<>(requestedPostIds)),
                ErrorCode.PARAMS_ERROR, "文章目录与当前数据不一致，请刷新后重试");
        for (int chapterIndex = 0; chapterIndex < request.getChapters().size(); chapterIndex++) {
            BlogOutlineReorderRequest.ChapterOrderItem item = request.getChapters().get(chapterIndex);
            BlogChapter chapter = new BlogChapter();
            chapter.setId(item.getChapterId());
            chapter.setSort(chapterIndex * 10);
            blogChapterMapper.updateById(chapter);
            List<Long> postIds = item.getPostIds() == null ? Collections.emptyList() : item.getPostIds();
            for (int postIndex = 0; postIndex < postIds.size(); postIndex++) {
                BlogPost post = new BlogPost();
                post.setId(postIds.get(postIndex));
                post.setChapterId(item.getChapterId());
                post.setChapterSort(postIndex * 10);
                blogPostMapper.updateById(post);
            }
        }
        return true;
    }

    @Override
    public Boolean assignPost(Long postId, Long chapterId) {
        if (postId == null || postId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        BlogPost existing = blogPostMapper.selectOne(new QueryWrapper<BlogPost>()
                .eq("id", postId).eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(existing == null, ErrorCode.NOT_FOUND_ERROR);
        BlogPost update = new BlogPost();
        update.setId(postId);
        if (chapterId == null) {
            blogPostMapper.update(null, new UpdateWrapper<BlogPost>().eq("id", postId)
                    .set("chapterId", null).set("chapterSort", 0));
            return true;
        }
        BlogChapter chapter = getValidChapter(chapterId);
        BlogBook book = getValidBook(chapter.getBookId());
        BlogPost last = blogPostMapper.selectOne(new QueryWrapper<BlogPost>()
                .eq("chapterId", chapterId).eq("isDelete", 0)
                .orderByDesc("chapterSort").orderByDesc("id").last("LIMIT 1"));
        update.setChapterId(chapterId);
        update.setChapterSort(last == null ? 0 : last.getChapterSort() + 10);
        update.setCategoryId(book.getCategoryId());
        ThrowUtils.throwIf(blogPostMapper.updateById(update) <= 0, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public Page<BlogBookVO> listPublishedBooks(BlogBookQueryRequest request, User loginUser) {
        BlogBookQueryRequest safeRequest = request == null ? new BlogBookQueryRequest() : request;
        List<BlogBook> books = this.list(buildQuery(safeRequest).eq("status", STATUS_ENABLED)
                .orderByAsc("sort").orderByDesc("updateTime").orderByDesc("id"));
        List<BlogBookVO> visible = toBookVOList(books, false, true, loginUser).stream()
                .filter(item -> item.getPublishedPostCount() != null && item.getPublishedPostCount() > 0)
                .collect(Collectors.toList());
        int from = Math.min((safeRequest.getCurrent() - 1) * safeRequest.getPageSize(), visible.size());
        int to = Math.min(from + safeRequest.getPageSize(), visible.size());
        Page<BlogBookVO> page = new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize(), visible.size());
        page.setRecords(new ArrayList<>(visible.subList(from, to)));
        return page;
    }

    @Override
    public BlogBookVO getPublishedBook(String slug, User loginUser) {
        if (StringUtils.isBlank(slug)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        BlogBook book = this.getOne(new QueryWrapper<BlogBook>()
                .eq("slug", slug.trim().toLowerCase()).eq("status", STATUS_ENABLED)
                .eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.NOT_FOUND_ERROR);
        BlogBookVO vo = toBookVOList(Collections.singletonList(book), true, true, loginUser).get(0);
        ThrowUtils.throwIf(vo.getPublishedPostCount() == null || vo.getPublishedPostCount() == 0,
                ErrorCode.NOT_FOUND_ERROR);
        return vo;
    }

    private QueryWrapper<BlogBook> buildQuery(BlogBookQueryRequest request) {
        QueryWrapper<BlogBook> wrapper = new QueryWrapper<BlogBook>().eq("isDelete", 0)
                .eq(request.getCategoryId() != null, "categoryId", request.getCategoryId())
                .eq(StringUtils.isNotBlank(request.getStatus()), "status", request.getStatus());
        if (StringUtils.isNotBlank(request.getKeyword())) {
            String keyword = request.getKeyword().trim();
            wrapper.and(w -> w.like("title", keyword).or().like("summary", keyword));
        }
        return wrapper;
    }

    private List<BlogBookVO> toBookVOList(List<BlogBook> books, boolean includeOutline,
            boolean publicOnly, User loginUser) {
        if (books == null || books.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> categoryIds = books.stream().map(BlogBook::getCategoryId).collect(Collectors.toSet());
        Map<Long, BlogCategory> categories = blogCategoryMapper.selectBatchIds(categoryIds).stream()
                .collect(Collectors.toMap(BlogCategory::getId, Function.identity(), (a, b) -> a));
        List<Long> bookIds = books.stream().map(BlogBook::getId).collect(Collectors.toList());
        List<BlogChapter> chapters = blogChapterMapper.selectList(new QueryWrapper<BlogChapter>()
                .in("bookId", bookIds).eq("isDelete", 0).orderByAsc("sort").orderByAsc("id"));
        Map<Long, List<BlogChapter>> chapterMap = chapters.stream()
                .collect(Collectors.groupingBy(BlogChapter::getBookId));
        List<Long> chapterIds = chapters.stream().map(BlogChapter::getId).collect(Collectors.toList());
        List<BlogPostVO> posts = publicOnly
                ? blogPostService.listPublishedPostsByChapterIds(chapterIds, loginUser)
                : blogPostService.listAdminPostsByChapterIds(chapterIds);
        Map<Long, List<BlogPostVO>> postMap = posts.stream()
                .collect(Collectors.groupingBy(BlogPostVO::getChapterId));
        List<BlogBookVO> result = new ArrayList<>();
        for (BlogBook book : books) {
            BlogBookVO vo = new BlogBookVO();
            BeanUtils.copyProperties(book, vo);
            if (!includeOutline) {
                vo.setIntroductionHtml(null);
            }
            BlogCategory category = categories.get(book.getCategoryId());
            if (category != null) {
                BlogCategoryVO categoryVO = new BlogCategoryVO();
                BeanUtils.copyProperties(category, categoryVO);
                vo.setCategory(categoryVO);
            }
            List<BlogChapterVO> chapterVOs = new ArrayList<>();
            int totalPosts = 0;
            int publishedPosts = 0;
            for (BlogChapter chapter : chapterMap.getOrDefault(book.getId(), Collections.emptyList())) {
                BlogChapterVO chapterVO = new BlogChapterVO();
                BeanUtils.copyProperties(chapter, chapterVO);
                List<BlogPostVO> chapterPosts = new ArrayList<>(postMap.getOrDefault(chapter.getId(), Collections.emptyList()));
                chapterPosts.sort(Comparator.comparing(BlogPostVO::getChapterSort,
                        Comparator.nullsFirst(Integer::compareTo)).thenComparing(BlogPostVO::getId));
                chapterVO.setPostCount(chapterPosts.size());
                int chapterPublished = (int) chapterPosts.stream()
                        .filter(item -> POST_PUBLISHED.equals(item.getStatus())).count();
                chapterVO.setPublishedPostCount(chapterPublished);
                chapterVO.setPosts(includeOutline ? chapterPosts : null);
                totalPosts += chapterPosts.size();
                publishedPosts += chapterPublished;
                chapterVOs.add(chapterVO);
            }
            vo.setChapterCount(chapterVOs.size());
            vo.setPostCount(totalPosts);
            vo.setPublishedPostCount(publishedPosts);
            vo.setChapters(includeOutline ? chapterVOs : null);
            result.add(vo);
        }
        return result;
    }

    private void validateBookRequest(BlogBookSaveRequest request) {
        if (request == null || request.getCategoryId() == null || request.getCategoryId() <= 0
                || StringUtils.isBlank(request.getTitle()) || request.getTitle().trim().length() > 255) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "教程书标题和分类不能为空");
        }
        BlogCategory category = blogCategoryMapper.selectById(request.getCategoryId());
        ThrowUtils.throwIf(category == null || !STATUS_ENABLED.equals(category.getStatus()),
                ErrorCode.PARAMS_ERROR, "教程分类不存在或已停用");
        String slug = request.getSlug();
        if (StringUtils.isBlank(slug) || slug.length() > 160
                || !slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "教程书 slug 仅支持小写字母、数字和中划线");
        }
        QueryWrapper<BlogBook> duplicate = new QueryWrapper<BlogBook>()
                .eq("slug", slug.trim().toLowerCase()).eq("isDelete", 0);
        duplicate.ne(request.getId() != null, "id", request.getId());
        ThrowUtils.throwIf(this.count(duplicate) > 0, ErrorCode.PARAMS_ERROR, "教程书 slug 已存在");
        if (request.getSummary() != null && request.getSummary().length() > 1000) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "教程书摘要不能超过 1000 字");
        }
        if (request.getIntroductionHtml() != null
                && request.getIntroductionHtml().length() > MAX_INTRODUCTION_HTML_LENGTH) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "教程书介绍内容过长");
        }
        if (request.getSeoDescription() != null && request.getSeoDescription().length() > 512) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "SEO 描述不能超过 512 字");
        }
        String status = StringUtils.defaultIfBlank(request.getStatus(), STATUS_DISABLED);
        if (!STATUS_ENABLED.equals(status) && !STATUS_DISABLED.equals(status)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "教程书状态不合法");
        }
        if (request.getMemberOnly() != null && request.getMemberOnly() != 0 && request.getMemberOnly() != 1) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "教程书权限仅支持免费或会员专享");
        }
        validateHttpsUrl(request.getCoverUrl());
    }

    private String toPlainText(String html) {
        String withoutTags = StringUtils.defaultString(html)
                .replaceAll("(?i)<br\\s*/?>", " ")
                .replaceAll("(?i)</(?:p|h[1-6]|li|blockquote)>", " ")
                .replaceAll("<[^>]+>", " ");
        return StringUtils.normalizeSpace(StringEscapeUtils.unescapeHtml4(withoutTags));
    }

    private void validateHttpsUrl(String value) {
        if (StringUtils.isBlank(value)) {
            return;
        }
        try {
            URI uri = URI.create(value.trim());
            boolean localHttp = "http".equalsIgnoreCase(uri.getScheme())
                    && ("localhost".equalsIgnoreCase(uri.getHost()) || "127.0.0.1".equals(uri.getHost()));
            if (!"https".equalsIgnoreCase(uri.getScheme()) && !localHttp) {
                throw new IllegalArgumentException();
            }
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "封面地址必须是 HTTPS 地址");
        }
    }

    private BlogBook getValidBook(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        BlogBook book = this.getOne(new QueryWrapper<BlogBook>()
                .eq("id", id).eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.NOT_FOUND_ERROR);
        return book;
    }

    private BlogChapter getValidChapter(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        BlogChapter chapter = blogChapterMapper.selectOne(new QueryWrapper<BlogChapter>()
                .eq("id", id).eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(chapter == null, ErrorCode.NOT_FOUND_ERROR);
        return chapter;
    }

    private List<Long> listChapterIds(Long bookId) {
        return blogChapterMapper.selectList(new QueryWrapper<BlogChapter>()
                .eq("bookId", bookId).eq("isDelete", 0)).stream()
                .map(BlogChapter::getId).collect(Collectors.toList());
    }
}
