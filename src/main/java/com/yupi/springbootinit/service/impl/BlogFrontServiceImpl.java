package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
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
import com.yupi.springbootinit.model.entity.BlogBook;
import com.yupi.springbootinit.model.entity.BlogBookFavorite;
import com.yupi.springbootinit.model.entity.BlogCategory;
import com.yupi.springbootinit.model.entity.BlogChapter;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.entity.BlogPostFavorite;
import com.yupi.springbootinit.model.entity.BlogPostTag;
import com.yupi.springbootinit.model.entity.BlogTag;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookDetailVO;
import com.yupi.springbootinit.model.vo.blog.BlogFavoriteCountVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookListVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontChapterVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontFilterOptionVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontFiltersVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontNavVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontOverviewVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostDetailVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostOutlineVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogPostReadResultVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontTaxonomyVO;
import com.yupi.springbootinit.service.BlogFrontService;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.regex.Pattern;
import javax.annotation.Resource;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BlogFrontServiceImpl implements BlogFrontService {

    private static final String STATUS_ENABLED = "enabled";
    private static final String STATUS_PUBLISHED = "published";
    private static final String VISIBILITY_PUBLIC = "public";
    private static final String VISIBILITY_LOGIN = "login";
    private static final String VISIBILITY_ADMIN = "admin";
    private static final String ACCESS_FREE = "free";
    private static final String ACCESS_MEMBER = "member";
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Shanghai");
    private static final Pattern VISITOR_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_-]{16,128}$");
    private static final int MIN_READ_SECONDS = 10;
    private static final int MAX_READ_SECONDS = 24 * 60 * 60;

    @Value("${site.analytics.hash-secret:ownai-site-analytics-local}")
    private String analyticsHashSecret;

    @Resource
    private JdbcTemplate jdbcTemplate;

    @Resource
    private BlogBookMapper blogBookMapper;

    @Resource
    private BlogBookFavoriteMapper blogBookFavoriteMapper;

    @Resource
    private BlogChapterMapper blogChapterMapper;

    @Resource
    private BlogPostMapper blogPostMapper;

    @Resource
    private BlogPostFavoriteMapper blogPostFavoriteMapper;

    @Resource
    private BlogCategoryMapper blogCategoryMapper;

    @Resource
    private BlogTagMapper blogTagMapper;

    @Resource
    private BlogPostTagMapper blogPostTagMapper;

    @Override
    public BlogFrontOverviewVO getOverview(User loginUser) {
        BlogFrontOverviewVO vo = new BlogFrontOverviewVO();
        vo.setBookCount(blogBookMapper.selectCount(buildBookQuery(null, loginUser, null)));
        vo.setFreeBookCount(blogBookMapper.selectCount(buildBookQuery(null, loginUser, ACCESS_FREE)));
        vo.setMemberBookCount(blogBookMapper.selectCount(buildBookQuery(null, loginUser, ACCESS_MEMBER)));
        BlogFrontPostQueryRequest allPostRequest = new BlogFrontPostQueryRequest();
        allPostRequest.setStandaloneOnly(false);
        vo.setPublishedPostCount(blogPostMapper.selectCount(buildPostQuery(allPostRequest, loginUser)));
        return vo;
    }

    @Override
    public Page<BlogFrontBookListVO> listBooks(BlogFrontBookQueryRequest request, User loginUser) {
        BlogFrontBookQueryRequest safeRequest = request == null ? new BlogFrontBookQueryRequest() : request;
        validateBookQuery(safeRequest);
        QueryWrapper<BlogBook> wrapper = buildBookQuery(safeRequest, loginUser, safeRequest.getAccessType());
        applyBookSort(wrapper, safeRequest.getSort());
        Page<BlogBook> entityPage = blogBookMapper.selectPage(
                new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), wrapper);
        Page<BlogFrontBookListVO> result = new Page<>(entityPage.getCurrent(), entityPage.getSize(), entityPage.getTotal());
        result.setRecords(buildBookVOs(entityPage.getRecords(), loginUser, false).stream()
                .map(item -> (BlogFrontBookListVO) item).collect(Collectors.toList()));
        return result;
    }

    @Override
    public BlogFrontBookDetailVO getBook(Long bookId, User loginUser) {
        validateId(bookId);
        BlogBook book = blogBookMapper.selectOne(buildBookQuery(null, loginUser, null)
                .eq("id", bookId).last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.NOT_FOUND_ERROR);
        List<BlogFrontBookDetailVO> details = buildBookVOs(Collections.singletonList(book), loginUser, true);
        ThrowUtils.throwIf(details.isEmpty() || details.get(0).getPublishedPostCount() == 0,
                ErrorCode.NOT_FOUND_ERROR);
        return details.get(0);
    }

    @Override
    public Page<BlogFrontPostOutlineVO> listPosts(BlogFrontPostQueryRequest request, User loginUser) {
        BlogFrontPostQueryRequest safeRequest = request == null ? new BlogFrontPostQueryRequest() : request;
        validatePostQuery(safeRequest);
        QueryWrapper<BlogPost> wrapper = buildPostQuery(safeRequest, loginUser);
        if ("popular".equals(safeRequest.getSort())) {
            applyPopularPostSort(wrapper);
        } else {
            wrapper.orderByDesc("publishedAt").orderByDesc("id");
        }
        Page<BlogPost> entityPage = blogPostMapper.selectPage(
                new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), wrapper);
        Page<BlogFrontPostOutlineVO> result = new Page<>(entityPage.getCurrent(), entityPage.getSize(), entityPage.getTotal());
        result.setRecords(buildPostOutlines(entityPage.getRecords(), loginUser));
        return result;
    }

    @Override
    public BlogFrontPostDetailVO getPost(Long postId, User loginUser) {
        validateId(postId);
        BlogPost post = blogPostMapper.selectOne(new QueryWrapper<BlogPost>()
                .eq("id", postId).eq("isDelete", 0).eq("status", STATUS_PUBLISHED)
                .le("publishedAt", new Date()).last("LIMIT 1"));
        ThrowUtils.throwIf(post == null, ErrorCode.NOT_FOUND_ERROR);
        validatePostVisibility(post, loginUser);
        BookContext context = resolveBookContext(post);
        validateEnabledCategory(post.getCategoryId());
        boolean bookMemberOnly = context.book != null && Objects.equals(context.book.getMemberOnly(), 1);
        if ((bookMemberOnly || Objects.equals(post.getMemberOnly(), 1)) && !canAccessMemberContent(loginUser)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_ERROR, "会员专享内容，请开通有效会员后查看");
        }
        BlogFrontPostDetailVO vo = new BlogFrontPostDetailVO();
        BeanUtils.copyProperties(post, vo);
        vo.setCanAccess(true);
        vo.setCategory(toCategoryVO(blogCategoryMapper.selectById(post.getCategoryId())));
        vo.setTags(loadPostTags(Collections.singletonList(post.getId())).getOrDefault(post.getId(), Collections.emptyList()));
        FavoriteStats favoriteStats = loadPostFavoriteStats(Collections.singletonList(post.getId()), loginUser);
        vo.setFavorited(favoriteStats.myFavoriteIds.contains(post.getId()));
        vo.setFavoriteCount(favoriteStats.counts.getOrDefault(post.getId(), 0));
        ReadStats readStats = loadReadStats(Collections.singletonList(post.getId()));
        vo.setReadCount(readStats.readCounts.getOrDefault(post.getId(), 0L));
        vo.setUniqueReaderCount(readStats.uniqueReaderCounts.getOrDefault(post.getId(), 0L));
        if (context.chapter != null) {
            vo.setChapterId(context.chapter.getId());
            vo.setChapterTitle(context.chapter.getTitle());
        }
        if (context.book != null) {
            vo.setBookId(context.book.getId());
            vo.setBookTitle(context.book.getTitle());
            vo.setBookSlug(context.book.getSlug());
            applyNavigation(vo, context.book, loginUser);
        }
        return vo;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BlogPostReadResultVO trackPostRead(BlogPostReadTrackRequest request, User loginUser) {
        if (request == null || request.getPostId() == null || request.getPostId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "文章 id 不能为空");
        }
        if (request.getDurationSeconds() == null || request.getDurationSeconds() < MIN_READ_SECONDS
                || request.getDurationSeconds() > MAX_READ_SECONDS) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "有效阅读时长必须在 10 秒到 24 小时之间");
        }
        String visitorId = StringUtils.trimToEmpty(request.getVisitorId());
        if ((loginUser == null || loginUser.getId() == null)
                && !VISITOR_ID_PATTERN.matcher(visitorId).matches()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "匿名阅读需要有效的 visitorId");
        }
        if (StringUtils.isNotBlank(visitorId) && !VISITOR_ID_PATTERN.matcher(visitorId).matches()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "visitorId 格式不正确");
        }

        BlogPost post = blogPostMapper.selectOne(new QueryWrapper<BlogPost>()
                .eq("id", request.getPostId()).eq("isDelete", 0).eq("status", STATUS_PUBLISHED)
                .le("publishedAt", new Date()).last("LIMIT 1"));
        ThrowUtils.throwIf(post == null, ErrorCode.NOT_FOUND_ERROR);
        validatePostVisibility(post, loginUser);
        BookContext context = resolveBookContext(post);
        validateEnabledCategory(post.getCategoryId());
        boolean bookMemberOnly = context.book != null && Objects.equals(context.book.getMemberOnly(), 1);
        if ((bookMemberOnly || Objects.equals(post.getMemberOnly(), 1)) && !canAccessMemberContent(loginUser)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_ERROR, "会员专享内容，请开通有效会员后查看");
        }

        String visitorHash = StringUtils.isBlank(visitorId)
                ? hashReaderIdentity("user:" + loginUser.getId())
                : hashReaderIdentity("visitor:" + visitorId);
        String readerKey = loginUser != null && loginUser.getId() != null
                ? hashReaderIdentity("user:" + loginUser.getId())
                : visitorHash;
        LocalDate readDate = LocalDate.now(BUSINESS_ZONE);
        Timestamp now = new Timestamp(System.currentTimeMillis());
        boolean counted;
        try {
            counted = jdbcTemplate.update("INSERT INTO blog_post_read_event "
                            + "(id, postId, bookId, userId, visitorHash, readerKey, readDate, durationSeconds, "
                            + "eventTime, createTime) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    IdWorker.getId(), post.getId(), context.book == null ? null : context.book.getId(),
                    loginUser == null ? null : loginUser.getId(), visitorHash, readerKey,
                    java.sql.Date.valueOf(readDate), request.getDurationSeconds(), now, now) > 0;
        } catch (DuplicateKeyException ignored) {
            counted = false;
        }
        ReadStats stats = loadReadStats(Collections.singletonList(post.getId()));
        BlogPostReadResultVO result = new BlogPostReadResultVO();
        result.setCounted(counted);
        result.setReadCount(stats.readCounts.getOrDefault(post.getId(), 0L));
        result.setUniqueReaderCount(stats.uniqueReaderCounts.getOrDefault(post.getId(), 0L));
        return result;
    }

    @Override
    public BlogFrontFiltersVO getFilters(User loginUser) {
        BlogFrontFiltersVO result = new BlogFrontFiltersVO();
        List<BlogFrontFilterOptionVO> categories = blogCategoryMapper.selectList(new QueryWrapper<BlogCategory>()
                .eq("isDelete", 0).eq("status", STATUS_ENABLED).orderByAsc("sort").orderByAsc("id"))
                .stream().map(category -> {
                    BlogFrontBookQueryRequest request = new BlogFrontBookQueryRequest();
                    request.setCategoryId(category.getId());
                    BlogFrontFilterOptionVO option = toFilterOption(category.getId(), category.getName(), category.getSlug());
                    option.setCount(blogBookMapper.selectCount(buildBookQuery(request, loginUser, null)));
                    return option;
                }).filter(option -> option.getCount() > 0).collect(Collectors.toList());
        List<BlogFrontFilterOptionVO> tags = blogTagMapper.selectList(new QueryWrapper<BlogTag>()
                .eq("isDelete", 0).eq("status", STATUS_ENABLED).orderByAsc("sort").orderByAsc("id"))
                .stream().map(tag -> {
                    BlogFrontBookQueryRequest request = new BlogFrontBookQueryRequest();
                    request.setTagId(tag.getId());
                    BlogFrontFilterOptionVO option = toFilterOption(tag.getId(), tag.getName(), tag.getSlug());
                    option.setCount(blogBookMapper.selectCount(buildBookQuery(request, loginUser, null)));
                    return option;
                }).filter(option -> option.getCount() > 0).collect(Collectors.toList());
        result.setCategories(categories);
        result.setTags(tags);
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean addBookFavorite(Long bookId, User loginUser) {
        requireLoginUser(loginUser);
        requireCollectibleBook(bookId, loginUser);
        BlogBookFavorite existing = blogBookFavoriteMapper.selectByUserAndBookIncludingDeleted(
                loginUser.getId(), bookId);
        if (existing != null) {
            if (existing.getIsDelete() == null || existing.getIsDelete() == 0) {
                return true;
            }
            boolean restored = blogBookFavoriteMapper.restoreByUserAndBook(loginUser.getId(), bookId) > 0;
            ThrowUtils.throwIf(!restored, ErrorCode.OPERATION_ERROR);
            return true;
        }
        Date now = new Date();
        BlogBookFavorite favorite = new BlogBookFavorite();
        favorite.setUserId(loginUser.getId());
        favorite.setBookId(bookId);
        favorite.setCreateTime(now);
        favorite.setUpdateTime(now);
        favorite.setIsDelete(0);
        boolean saved;
        try {
            saved = blogBookFavoriteMapper.insert(favorite) > 0;
        } catch (DuplicateKeyException e) {
            saved = blogBookFavoriteMapper.restoreByUserAndBook(loginUser.getId(), bookId) > 0;
        }
        ThrowUtils.throwIf(!saved, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean cancelBookFavorite(Long bookId, User loginUser) {
        requireLoginUser(loginUser);
        validateId(bookId);
        blogBookFavoriteMapper.update(null, new UpdateWrapper<BlogBookFavorite>()
                .eq("userId", loginUser.getId()).eq("bookId", bookId).eq("isDelete", 0)
                .set("isDelete", 1).set("updateTime", new Date()));
        return true;
    }

    @Override
    public Boolean isBookFavorited(Long bookId, User loginUser) {
        requireLoginUser(loginUser);
        validateId(bookId);
        return blogBookFavoriteMapper.selectCount(new QueryWrapper<BlogBookFavorite>()
                .eq("userId", loginUser.getId()).eq("bookId", bookId).eq("isDelete", 0)) > 0;
    }

    @Override
    public Page<BlogFrontBookListVO> listMyFavoriteBooks(BlogFrontBookQueryRequest request, User loginUser) {
        requireLoginUser(loginUser);
        BlogFrontBookQueryRequest safeRequest = request == null ? new BlogFrontBookQueryRequest() : request;
        validateBookQuery(safeRequest);
        QueryWrapper<BlogBook> wrapper = buildBookQuery(safeRequest, loginUser, safeRequest.getAccessType());
        wrapper.inSql("id", "SELECT bookId FROM blog_book_favorite WHERE userId = "
                + loginUser.getId() + " AND isDelete = 0");
        applyBookSort(wrapper, safeRequest.getSort());
        Page<BlogBook> entityPage = blogBookMapper.selectPage(
                new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), wrapper);
        Page<BlogFrontBookListVO> result = new Page<>(entityPage.getCurrent(), entityPage.getSize(), entityPage.getTotal());
        result.setRecords(buildBookVOs(entityPage.getRecords(), loginUser, false).stream()
                .map(item -> (BlogFrontBookListVO) item).collect(Collectors.toList()));
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean addPostFavorite(Long postId, User loginUser) {
        requireLoginUser(loginUser);
        requireCollectiblePost(postId, loginUser);
        BlogPostFavorite existing = blogPostFavoriteMapper.selectByUserAndPostIncludingDeleted(
                loginUser.getId(), postId);
        if (existing != null) {
            if (existing.getIsDelete() == null || existing.getIsDelete() == 0) {
                return true;
            }
            boolean restored = blogPostFavoriteMapper.restoreByUserAndPost(loginUser.getId(), postId) > 0;
            ThrowUtils.throwIf(!restored, ErrorCode.OPERATION_ERROR);
            return true;
        }
        Date now = new Date();
        BlogPostFavorite favorite = new BlogPostFavorite();
        favorite.setUserId(loginUser.getId());
        favorite.setPostId(postId);
        favorite.setCreateTime(now);
        favorite.setUpdateTime(now);
        favorite.setIsDelete(0);
        boolean saved;
        try {
            saved = blogPostFavoriteMapper.insert(favorite) > 0;
        } catch (DuplicateKeyException e) {
            saved = blogPostFavoriteMapper.restoreByUserAndPost(loginUser.getId(), postId) > 0;
        }
        ThrowUtils.throwIf(!saved, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean cancelPostFavorite(Long postId, User loginUser) {
        requireLoginUser(loginUser);
        validateId(postId);
        blogPostFavoriteMapper.update(null, new UpdateWrapper<BlogPostFavorite>()
                .eq("userId", loginUser.getId()).eq("postId", postId).eq("isDelete", 0)
                .set("isDelete", 1).set("updateTime", new Date()));
        return true;
    }

    @Override
    public Boolean isPostFavorited(Long postId, User loginUser) {
        requireLoginUser(loginUser);
        validateId(postId);
        return blogPostFavoriteMapper.selectCount(new QueryWrapper<BlogPostFavorite>()
                .eq("userId", loginUser.getId()).eq("postId", postId).eq("isDelete", 0)) > 0;
    }

    @Override
    public Page<BlogFrontPostOutlineVO> listMyFavoritePosts(BlogFrontPostQueryRequest request, User loginUser) {
        requireLoginUser(loginUser);
        BlogFrontPostQueryRequest safeRequest = request == null ? new BlogFrontPostQueryRequest() : request;
        safeRequest.setStandaloneOnly(false);
        validatePostQuery(safeRequest);
        QueryWrapper<BlogPost> wrapper = buildPostQuery(safeRequest, loginUser);
        wrapper.inSql("id", "SELECT postId FROM blog_post_favorite WHERE userId = "
                + loginUser.getId() + " AND isDelete = 0");
        if ("popular".equals(safeRequest.getSort())) {
            applyPopularPostSort(wrapper);
        } else {
            wrapper.orderByDesc("publishedAt").orderByDesc("id");
        }
        Page<BlogPost> entityPage = blogPostMapper.selectPage(
                new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), wrapper);
        Page<BlogFrontPostOutlineVO> result = new Page<>(entityPage.getCurrent(), entityPage.getSize(), entityPage.getTotal());
        result.setRecords(buildPostOutlines(entityPage.getRecords(), loginUser));
        return result;
    }

    private QueryWrapper<BlogBook> buildBookQuery(BlogFrontBookQueryRequest request, User loginUser,
            String forcedAccessType) {
        BlogFrontBookQueryRequest safeRequest = request == null ? new BlogFrontBookQueryRequest() : request;
        QueryWrapper<BlogBook> wrapper = new QueryWrapper<BlogBook>()
                .eq("isDelete", 0).eq("status", STATUS_ENABLED)
                .inSql("categoryId", "SELECT id FROM blog_category WHERE status = 'enabled' AND isDelete = 0")
                .eq(safeRequest.getCategoryId() != null, "categoryId", safeRequest.getCategoryId());
        if (StringUtils.isNotBlank(safeRequest.getKeyword())) {
            String keyword = safeRequest.getKeyword().trim();
            wrapper.and(w -> w.like("title", keyword).or().like("summary", keyword));
        }
        String published = publishedPostExistsSql("blog_book.id", loginUser, null, null);
        wrapper.exists(published);
        if (safeRequest.getTagId() != null) {
            wrapper.exists(publishedPostExistsSql("blog_book.id", loginUser, null, safeRequest.getTagId()));
        }
        String accessType = StringUtils.defaultIfBlank(forcedAccessType, safeRequest.getAccessType());
        if (ACCESS_FREE.equals(accessType)) {
            wrapper.eq("memberOnly", 0);
        } else if (ACCESS_MEMBER.equals(accessType)) {
            wrapper.eq("memberOnly", 1);
        }
        return wrapper;
    }

    private QueryWrapper<BlogPost> buildPostQuery(BlogFrontPostQueryRequest request, User loginUser) {
        BlogFrontPostQueryRequest safeRequest = request == null ? new BlogFrontPostQueryRequest() : request;
        QueryWrapper<BlogPost> wrapper = new QueryWrapper<BlogPost>()
                .eq("isDelete", 0).eq("status", STATUS_PUBLISHED).le("publishedAt", new Date())
                .inSql("categoryId", "SELECT id FROM blog_category WHERE status = 'enabled' AND isDelete = 0")
                .eq(safeRequest.getCategoryId() != null, "categoryId", safeRequest.getCategoryId())
                .eq(safeRequest.getMemberOnly() != null, "memberOnly", safeRequest.getMemberOnly());
        applyVisibility(wrapper, loginUser);
        if (!Boolean.FALSE.equals(safeRequest.getStandaloneOnly())) {
            wrapper.isNull("chapterId");
        } else {
            wrapper.and(w -> w.isNull("chapterId").or().exists(
                    "SELECT 1 FROM blog_chapter bc JOIN blog_book bb ON bb.id = bc.bookId "
                            + "WHERE bc.id = blog_post.chapterId AND bc.isDelete = 0 "
                            + "AND bb.status = 'enabled' AND bb.isDelete = 0"));
        }
        if (safeRequest.getTagId() != null) {
            wrapper.exists("SELECT 1 FROM blog_post_tag bpt JOIN blog_tag bt ON bt.id = bpt.tagId "
                    + "WHERE bpt.postId = blog_post.id AND bpt.tagId = " + safeRequest.getTagId()
                    + " AND bt.status = 'enabled' AND bt.isDelete = 0");
        }
        if (StringUtils.isNotBlank(safeRequest.getKeyword())) {
            String keyword = safeRequest.getKeyword().trim();
            wrapper.and(w -> w.like("title", keyword).or().like("summary", keyword));
        }
        return wrapper;
    }

    private String publishedPostExistsSql(String bookIdExpression, User loginUser, Integer memberOnly, Long tagId) {
        StringBuilder sql = new StringBuilder("SELECT 1 FROM blog_chapter bc JOIN blog_post bp ON bp.chapterId = bc.id ");
        if (tagId != null) {
            sql.append("JOIN blog_post_tag bpt ON bpt.postId = bp.id JOIN blog_tag bt ON bt.id = bpt.tagId ");
        }
        sql.append("WHERE bc.bookId = ").append(bookIdExpression)
                .append(" AND bc.isDelete = 0 AND bp.isDelete = 0 AND bp.status = 'published' ")
                .append("AND bp.publishedAt <= NOW() ").append(visibilitySql("bp", loginUser));
        if (memberOnly != null) {
            sql.append(memberOnly == 1 ? " AND bp.memberOnly = 1" : " AND COALESCE(bp.memberOnly, 0) = 0");
        }
        if (tagId != null) {
            sql.append(" AND bpt.tagId = ").append(tagId)
                    .append(" AND bt.status = 'enabled' AND bt.isDelete = 0");
        }
        return sql.toString();
    }

    private String visibilitySql(String alias, User loginUser) {
        if (isAdmin(loginUser)) {
            return "";
        }
        if (loginUser == null) {
            return " AND " + alias + ".visibility = 'public'";
        }
        return " AND " + alias + ".visibility IN ('public', 'login')";
    }

    private void applyVisibility(QueryWrapper<BlogPost> wrapper, User loginUser) {
        if (isAdmin(loginUser)) {
            return;
        }
        if (loginUser == null) {
            wrapper.eq("visibility", VISIBILITY_PUBLIC);
        } else {
            wrapper.in("visibility", VISIBILITY_PUBLIC, VISIBILITY_LOGIN);
        }
    }

    private void applyBookSort(QueryWrapper<BlogBook> wrapper, String sort) {
        if ("latest".equals(sort)) {
            wrapper.orderByDesc("updateTime").orderByDesc("id");
        } else if ("popular".equals(sort)) {
            wrapper.last("ORDER BY (SELECT COUNT(1) FROM blog_post_read_event bpre "
                    + "WHERE bpre.bookId = blog_book.id) DESC, "
                    + "updateTime DESC, id DESC");
        } else {
            wrapper.orderByAsc("sort").orderByDesc("updateTime").orderByDesc("id");
        }
    }

    private void applyPopularPostSort(QueryWrapper<BlogPost> wrapper) {
        wrapper.last("ORDER BY (SELECT COUNT(1) FROM blog_post_read_event bpre "
                + "WHERE bpre.postId = blog_post.id) DESC, publishedAt DESC, id DESC");
    }

    private List<BlogFrontBookDetailVO> buildBookVOs(List<BlogBook> books, User loginUser, boolean includeOutline) {
        if (books == null || books.isEmpty()) {
            return Collections.emptyList();
        }
        List<Long> bookIds = books.stream().map(BlogBook::getId).collect(Collectors.toList());
        List<BlogChapter> chapters = blogChapterMapper.selectList(new QueryWrapper<BlogChapter>()
                .in("bookId", bookIds).eq("isDelete", 0).orderByAsc("sort").orderByAsc("id"));
        List<Long> chapterIds = chapters.stream().map(BlogChapter::getId).collect(Collectors.toList());
        List<BlogPost> posts = chapterIds.isEmpty() ? Collections.emptyList()
                : blogPostMapper.selectList(new QueryWrapper<BlogPost>()
                        .in("chapterId", chapterIds).eq("isDelete", 0).eq("status", STATUS_PUBLISHED)
                        .le("publishedAt", new Date()).orderByAsc("chapterSort").orderByAsc("id"));
        posts = filterVisiblePosts(posts, loginUser);
        Map<Long, List<BlogPost>> postsByChapter = posts.stream()
                .collect(Collectors.groupingBy(BlogPost::getChapterId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, List<BlogChapter>> chaptersByBook = chapters.stream()
                .collect(Collectors.groupingBy(BlogChapter::getBookId, LinkedHashMap::new, Collectors.toList()));
        Map<Long, BlogCategory> categoryMap = blogCategoryMapper.selectBatchIds(books.stream()
                        .map(BlogBook::getCategoryId).collect(Collectors.toSet())).stream()
                .collect(Collectors.toMap(BlogCategory::getId, Function.identity(), (a, b) -> a));
        Map<Long, List<BlogFrontTaxonomyVO>> tagsByPost = loadPostTags(
                posts.stream().map(BlogPost::getId).collect(Collectors.toList()));
        FavoriteStats bookFavoriteStats = loadBookFavoriteStats(bookIds, loginUser);
        FavoriteStats postFavoriteStats = loadPostFavoriteStats(
                posts.stream().map(BlogPost::getId).collect(Collectors.toList()), loginUser);
        ReadStats readStats = loadReadStats(posts.stream().map(BlogPost::getId).collect(Collectors.toList()));
        boolean memberAccess = canAccessMemberContent(loginUser);
        List<BlogFrontBookDetailVO> result = new ArrayList<>();
        for (BlogBook book : books) {
            BlogFrontBookDetailVO vo = new BlogFrontBookDetailVO();
            BeanUtils.copyProperties(book, vo);
            vo.setIntroductionHtml(includeOutline ? book.getIntroductionHtml() : null);
            vo.setCategory(toCategoryVO(categoryMap.get(book.getCategoryId())));
            List<BlogFrontChapterVO> chapterVOs = new ArrayList<>();
            List<BlogPost> bookPosts = new ArrayList<>();
            LinkedHashMap<Long, BlogFrontTaxonomyVO> bookTags = new LinkedHashMap<>();
            for (BlogChapter chapter : chaptersByBook.getOrDefault(book.getId(), Collections.emptyList())) {
                List<BlogPost> chapterPosts = postsByChapter.getOrDefault(chapter.getId(), Collections.emptyList());
                if (chapterPosts.isEmpty()) {
                    continue;
                }
                bookPosts.addAll(chapterPosts);
                BlogFrontChapterVO chapterVO = new BlogFrontChapterVO();
                BeanUtils.copyProperties(chapter, chapterVO);
                List<BlogFrontPostOutlineVO> outlines = chapterPosts.stream().map(post -> {
                    List<BlogFrontTaxonomyVO> postTags = tagsByPost.getOrDefault(
                            post.getId(), Collections.emptyList());
                    postTags.forEach(tag -> bookTags.putIfAbsent(tag.getId(), tag));
                    return toPostOutline(post, chapter, book, postTags, memberAccess, postFavoriteStats, readStats);
                }).collect(Collectors.toList());
                chapterVO.setPostCount(outlines.size());
                chapterVO.setPosts(includeOutline ? outlines : null);
                chapterVOs.add(chapterVO);
            }
            int memberCount = (int) bookPosts.stream().filter(post -> Objects.equals(post.getMemberOnly(), 1)).count();
            int freeCount = bookPosts.size() - memberCount;
            vo.setChapterCount(chapterVOs.size());
            vo.setPublishedPostCount(bookPosts.size());
            vo.setFreePostCount(freeCount);
            vo.setMemberPostCount(memberCount);
            vo.setAccessType(Objects.equals(book.getMemberOnly(), 1) ? ACCESS_MEMBER : ACCESS_FREE);
            vo.setCanAccessAll((!Objects.equals(book.getMemberOnly(), 1) && memberCount == 0) || memberAccess);
            vo.setFavorited(bookFavoriteStats.myFavoriteIds.contains(book.getId()));
            vo.setFavoriteCount(bookFavoriteStats.counts.getOrDefault(book.getId(), 0));
            vo.setTags(new ArrayList<>(bookTags.values()));
            vo.setChapters(includeOutline ? chapterVOs : null);
            result.add(vo);
        }
        return result;
    }

    private List<BlogFrontPostOutlineVO> buildPostOutlines(List<BlogPost> posts, User loginUser) {
        if (posts == null || posts.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> chapterIds = posts.stream().map(BlogPost::getChapterId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, BlogChapter> chapterMap = chapterIds.isEmpty() ? Collections.emptyMap()
                : blogChapterMapper.selectBatchIds(chapterIds).stream()
                        .collect(Collectors.toMap(BlogChapter::getId, Function.identity()));
        Set<Long> bookIds = chapterMap.values().stream().map(BlogChapter::getBookId).collect(Collectors.toSet());
        Map<Long, BlogBook> bookMap = bookIds.isEmpty() ? Collections.emptyMap()
                : blogBookMapper.selectBatchIds(bookIds).stream()
                        .collect(Collectors.toMap(BlogBook::getId, Function.identity()));
        Map<Long, List<BlogFrontTaxonomyVO>> tags = loadPostTags(
                posts.stream().map(BlogPost::getId).collect(Collectors.toList()));
        FavoriteStats favoriteStats = loadPostFavoriteStats(
                posts.stream().map(BlogPost::getId).collect(Collectors.toList()), loginUser);
        ReadStats readStats = loadReadStats(posts.stream().map(BlogPost::getId).collect(Collectors.toList()));
        boolean memberAccess = canAccessMemberContent(loginUser);
        return posts.stream().map(post -> {
            BlogChapter chapter = chapterMap.get(post.getChapterId());
            BlogBook book = chapter == null ? null : bookMap.get(chapter.getBookId());
            return toPostOutline(post, chapter, book,
                    tags.getOrDefault(post.getId(), Collections.emptyList()), memberAccess, favoriteStats, readStats);
        }).collect(Collectors.toList());
    }

    private BlogFrontPostOutlineVO toPostOutline(BlogPost post, BlogChapter chapter, BlogBook book,
            List<BlogFrontTaxonomyVO> tags, boolean memberAccess, FavoriteStats favoriteStats, ReadStats readStats) {
        BlogFrontPostOutlineVO vo = new BlogFrontPostOutlineVO();
        BeanUtils.copyProperties(post, vo);
        vo.setTags(tags);
        vo.setCanAccess((book == null || !Objects.equals(book.getMemberOnly(), 1))
                && !Objects.equals(post.getMemberOnly(), 1) || memberAccess);
        vo.setFavorited(favoriteStats.myFavoriteIds.contains(post.getId()));
        vo.setFavoriteCount(favoriteStats.counts.getOrDefault(post.getId(), 0));
        vo.setReadCount(readStats.readCounts.getOrDefault(post.getId(), 0L));
        vo.setUniqueReaderCount(readStats.uniqueReaderCounts.getOrDefault(post.getId(), 0L));
        if (chapter != null) {
            vo.setChapterId(chapter.getId());
            vo.setChapterTitle(chapter.getTitle());
        }
        if (book != null) {
            vo.setBookId(book.getId());
            vo.setBookTitle(book.getTitle());
            vo.setBookSlug(book.getSlug());
        }
        return vo;
    }

    private FavoriteStats loadBookFavoriteStats(List<Long> bookIds, User loginUser) {
        if (bookIds == null || bookIds.isEmpty()) {
            return FavoriteStats.empty();
        }
        List<BlogFavoriteCountVO> countRows = blogBookFavoriteMapper.countByBookIds(bookIds);
        Map<Long, Integer> counts = countRows == null ? new LinkedHashMap<>() : countRows.stream()
                .collect(Collectors.toMap(BlogFavoriteCountVO::getTargetId,
                        BlogFavoriteCountVO::getFavoriteCount, (a, b) -> a, LinkedHashMap::new));
        Set<Long> myFavoriteIds = loginUser == null ? Collections.emptySet()
                : blogBookFavoriteMapper.selectList(new QueryWrapper<BlogBookFavorite>()
                        .eq("userId", loginUser.getId()).in("bookId", bookIds).eq("isDelete", 0)).stream()
                        .map(BlogBookFavorite::getBookId).collect(Collectors.toSet());
        return new FavoriteStats(counts, myFavoriteIds);
    }

    private ReadStats loadReadStats(List<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return ReadStats.empty();
        }
        Map<Long, Long> readCounts = new LinkedHashMap<>();
        Map<Long, Long> uniqueReaderCounts = new LinkedHashMap<>();
        String placeholders = postIds.stream().map(ignored -> "?").collect(Collectors.joining(","));
        jdbcTemplate.query("SELECT postId, COUNT(1) AS readCount, COUNT(DISTINCT readerKey) AS uniqueReaderCount "
                        + "FROM blog_post_read_event WHERE postId IN (" + placeholders + ") GROUP BY postId",
                row -> {
                    long postId = row.getLong("postId");
                    readCounts.put(postId, row.getLong("readCount"));
                    uniqueReaderCounts.put(postId, row.getLong("uniqueReaderCount"));
                }, postIds.toArray());
        return new ReadStats(readCounts, uniqueReaderCounts);
    }

    private FavoriteStats loadPostFavoriteStats(List<Long> postIds, User loginUser) {
        if (postIds == null || postIds.isEmpty()) {
            return FavoriteStats.empty();
        }
        List<BlogFavoriteCountVO> countRows = blogPostFavoriteMapper.countByPostIds(postIds);
        Map<Long, Integer> counts = countRows == null ? new LinkedHashMap<>() : countRows.stream()
                .collect(Collectors.toMap(BlogFavoriteCountVO::getTargetId,
                        BlogFavoriteCountVO::getFavoriteCount, (a, b) -> a, LinkedHashMap::new));
        Set<Long> myFavoriteIds = loginUser == null ? Collections.emptySet()
                : blogPostFavoriteMapper.selectList(new QueryWrapper<BlogPostFavorite>()
                        .eq("userId", loginUser.getId()).in("postId", postIds).eq("isDelete", 0)).stream()
                        .map(BlogPostFavorite::getPostId).collect(Collectors.toSet());
        return new FavoriteStats(counts, myFavoriteIds);
    }

    private Map<Long, List<BlogFrontTaxonomyVO>> loadPostTags(List<Long> postIds) {
        if (postIds == null || postIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<BlogPostTag> relations = blogPostTagMapper.selectList(new QueryWrapper<BlogPostTag>().in("postId", postIds));
        Set<Long> tagIds = relations.stream().map(BlogPostTag::getTagId).collect(Collectors.toSet());
        Map<Long, BlogTag> tagMap = tagIds.isEmpty() ? Collections.emptyMap()
                : blogTagMapper.selectList(new QueryWrapper<BlogTag>().in("id", tagIds)
                        .eq("isDelete", 0).eq("status", STATUS_ENABLED)).stream()
                        .collect(Collectors.toMap(BlogTag::getId, Function.identity()));
        Map<Long, List<BlogFrontTaxonomyVO>> result = new LinkedHashMap<>();
        for (BlogPostTag relation : relations) {
            BlogTag tag = tagMap.get(relation.getTagId());
            if (tag == null) {
                continue;
            }
            BlogFrontTaxonomyVO vo = new BlogFrontTaxonomyVO();
            BeanUtils.copyProperties(tag, vo);
            result.computeIfAbsent(relation.getPostId(), ignored -> new ArrayList<>()).add(vo);
        }
        result.values().forEach(items -> items.sort(Comparator.comparing(BlogFrontTaxonomyVO::getId)));
        return result;
    }

    private void applyNavigation(BlogFrontPostDetailVO current, BlogBook book, User loginUser) {
        List<BlogChapter> chapters = blogChapterMapper.selectList(new QueryWrapper<BlogChapter>()
                .eq("bookId", book.getId()).eq("isDelete", 0).orderByAsc("sort").orderByAsc("id"));
        if (chapters.isEmpty()) {
            return;
        }
        Map<Long, Integer> chapterOrder = new LinkedHashMap<>();
        for (int i = 0; i < chapters.size(); i++) {
            chapterOrder.put(chapters.get(i).getId(), i);
        }
        List<BlogPost> posts = blogPostMapper.selectList(new QueryWrapper<BlogPost>()
                .in("chapterId", chapterOrder.keySet()).eq("isDelete", 0).eq("status", STATUS_PUBLISHED)
                .le("publishedAt", new Date()));
        posts = filterVisiblePosts(posts, loginUser);
        posts.sort(Comparator.comparing((BlogPost post) -> chapterOrder.getOrDefault(post.getChapterId(), Integer.MAX_VALUE))
                .thenComparing(BlogPost::getChapterSort, Comparator.nullsFirst(Integer::compareTo))
                .thenComparing(BlogPost::getId));
        boolean memberAccess = canAccessMemberContent(loginUser);
        for (int index = 0; index < posts.size(); index++) {
            if (!Objects.equals(posts.get(index).getId(), current.getId())) {
                continue;
            }
            if (index > 0) {
                current.setPreviousPost(toNav(posts.get(index - 1), book, memberAccess));
            }
            if (index + 1 < posts.size()) {
                current.setNextPost(toNav(posts.get(index + 1), book, memberAccess));
            }
            return;
        }
    }

    private BlogFrontNavVO toNav(BlogPost post, BlogBook book, boolean memberAccess) {
        BlogFrontNavVO vo = new BlogFrontNavVO();
        vo.setId(post.getId());
        vo.setTitle(post.getTitle());
        vo.setSlug(post.getSlug());
        vo.setMemberOnly(post.getMemberOnly());
        vo.setCanAccess((!Objects.equals(book.getMemberOnly(), 1)
                && !Objects.equals(post.getMemberOnly(), 1)) || memberAccess);
        return vo;
    }

    private List<BlogPost> filterVisiblePosts(List<BlogPost> posts, User loginUser) {
        if (isAdmin(loginUser)) {
            return posts;
        }
        Set<String> allowed = loginUser == null
                ? Collections.singleton(VISIBILITY_PUBLIC)
                : new LinkedHashSet<>(java.util.Arrays.asList(VISIBILITY_PUBLIC, VISIBILITY_LOGIN));
        return posts.stream().filter(post -> allowed.contains(post.getVisibility())).collect(Collectors.toList());
    }

    private BookContext resolveBookContext(BlogPost post) {
        if (post.getChapterId() == null) {
            return new BookContext(null, null);
        }
        BlogChapter chapter = blogChapterMapper.selectOne(new QueryWrapper<BlogChapter>()
                .eq("id", post.getChapterId()).eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(chapter == null, ErrorCode.NOT_FOUND_ERROR);
        BlogBook book = blogBookMapper.selectOne(new QueryWrapper<BlogBook>()
                .eq("id", chapter.getBookId()).eq("isDelete", 0).eq("status", STATUS_ENABLED).last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.NOT_FOUND_ERROR);
        return new BookContext(chapter, book);
    }

    private void validatePostVisibility(BlogPost post, User loginUser) {
        if (isAdmin(loginUser) || VISIBILITY_PUBLIC.equals(post.getVisibility())) {
            return;
        }
        if (VISIBILITY_LOGIN.equals(post.getVisibility())) {
            if (loginUser == null) {
                throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR, "该文章登录后可查看");
            }
            return;
        }
        if (VISIBILITY_ADMIN.equals(post.getVisibility())) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
    }

    private void requireCollectibleBook(Long bookId, User loginUser) {
        validateId(bookId);
        BlogBook book = blogBookMapper.selectOne(buildBookQuery(null, loginUser, null)
                .eq("id", bookId).last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.NOT_FOUND_ERROR);
    }

    private void requireCollectiblePost(Long postId, User loginUser) {
        validateId(postId);
        BlogFrontPostQueryRequest request = new BlogFrontPostQueryRequest();
        request.setStandaloneOnly(false);
        BlogPost post = blogPostMapper.selectOne(buildPostQuery(request, loginUser)
                .eq("id", postId).last("LIMIT 1"));
        ThrowUtils.throwIf(post == null, ErrorCode.NOT_FOUND_ERROR);
    }

    private void requireLoginUser(User loginUser) {
        if (loginUser == null || loginUser.getId() == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
    }

    private void validateEnabledCategory(Long categoryId) {
        BlogCategory category = blogCategoryMapper.selectOne(new QueryWrapper<BlogCategory>()
                .eq("id", categoryId).eq("isDelete", 0).eq("status", STATUS_ENABLED).last("LIMIT 1"));
        ThrowUtils.throwIf(category == null, ErrorCode.NOT_FOUND_ERROR);
    }

    private boolean canAccessMemberContent(User user) {
        if (isAdmin(user)) {
            return true;
        }
        if (user == null) {
            return false;
        }
        MemberLevelEnum level = MemberLevelEnum.getEnumByValue(user.getMemberLevel());
        if (level == null || !level.canAccessMemberContent()) {
            return false;
        }
        return user.getMemberExpireTime() == null || user.getMemberExpireTime().after(new Date());
    }

    private boolean isAdmin(User user) {
        return user != null && UserConstant.ADMIN_ROLE.equals(user.getUserRole());
    }

    private BlogFrontTaxonomyVO toCategoryVO(BlogCategory category) {
        if (category == null) {
            return null;
        }
        BlogFrontTaxonomyVO vo = new BlogFrontTaxonomyVO();
        BeanUtils.copyProperties(category, vo);
        return vo;
    }

    private BlogFrontFilterOptionVO toFilterOption(Long id, String name, String slug) {
        BlogFrontFilterOptionVO vo = new BlogFrontFilterOptionVO();
        vo.setId(id);
        vo.setName(name);
        vo.setSlug(slug);
        return vo;
    }

    private String hashReaderIdentity(String identity) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(analyticsHashSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(identity.getBytes(StandardCharsets.UTF_8));
            StringBuilder builder = new StringBuilder(digest.length * 2);
            for (byte item : digest) {
                builder.append(String.format("%02x", item & 0xff));
            }
            return builder.toString();
        } catch (GeneralSecurityException e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "无法保护访客标识");
        }
    }

    private void validateBookQuery(BlogFrontBookQueryRequest request) {
        validatePage(request.getCurrent(), request.getPageSize());
        if (request.getCategoryId() != null && request.getCategoryId() <= 0
                || request.getTagId() != null && request.getTagId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "分类或标签 id 不正确");
        }
        if (StringUtils.isNotBlank(request.getAccessType())
                && !java.util.Arrays.asList(ACCESS_FREE, ACCESS_MEMBER).contains(request.getAccessType())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "accessType 仅支持 free、member");
        }
        if (StringUtils.isNotBlank(request.getSort())
                && !java.util.Arrays.asList("default", "latest", "popular").contains(request.getSort())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "sort 仅支持 default、latest、popular");
        }
    }

    private void validatePostQuery(BlogFrontPostQueryRequest request) {
        validatePage(request.getCurrent(), request.getPageSize());
        if (request.getCategoryId() != null && request.getCategoryId() <= 0
                || request.getTagId() != null && request.getTagId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "分类或标签 id 不正确");
        }
        if (request.getMemberOnly() != null && request.getMemberOnly() != 0 && request.getMemberOnly() != 1) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "memberOnly 仅支持 0 或 1");
        }
        if (StringUtils.isNotBlank(request.getSort())
                && !java.util.Arrays.asList("latest", "popular").contains(request.getSort())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "sort 仅支持 latest、popular");
        }
    }

    private void validatePage(int current, int pageSize) {
        if (current < 1 || pageSize < 1 || pageSize > 20) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "分页参数不正确，前台每页最多 20 条");
        }
    }

    private void validateId(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
    }

    private static class BookContext {
        private final BlogChapter chapter;
        private final BlogBook book;

        private BookContext(BlogChapter chapter, BlogBook book) {
            this.chapter = chapter;
            this.book = book;
        }
    }

    private static class FavoriteStats {
        private final Map<Long, Integer> counts;
        private final Set<Long> myFavoriteIds;

        private FavoriteStats(Map<Long, Integer> counts, Set<Long> myFavoriteIds) {
            this.counts = counts;
            this.myFavoriteIds = myFavoriteIds;
        }

        private static FavoriteStats empty() {
            return new FavoriteStats(Collections.emptyMap(), Collections.emptySet());
        }
    }

    private static class ReadStats {
        private final Map<Long, Long> readCounts;
        private final Map<Long, Long> uniqueReaderCounts;

        private ReadStats(Map<Long, Long> readCounts, Map<Long, Long> uniqueReaderCounts) {
            this.readCounts = readCounts;
            this.uniqueReaderCounts = uniqueReaderCounts;
        }

        private static ReadStats empty() {
            return new ReadStats(Collections.emptyMap(), Collections.emptyMap());
        }
    }
}
