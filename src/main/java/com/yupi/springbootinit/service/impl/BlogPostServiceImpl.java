package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.BlogCategoryMapper;
import com.yupi.springbootinit.mapper.BlogBookMapper;
import com.yupi.springbootinit.mapper.BlogChapterMapper;
import com.yupi.springbootinit.mapper.BlogPostMapper;
import com.yupi.springbootinit.mapper.BlogPostRevisionMapper;
import com.yupi.springbootinit.mapper.BlogPostTagMapper;
import com.yupi.springbootinit.mapper.BlogTagMapper;
import com.yupi.springbootinit.model.dto.blog.BlogPostAddRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostUpdateRequest;
import com.yupi.springbootinit.model.entity.BlogCategory;
import com.yupi.springbootinit.model.entity.BlogBook;
import com.yupi.springbootinit.model.entity.BlogChapter;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.entity.BlogPostRevision;
import com.yupi.springbootinit.model.entity.BlogPostTag;
import com.yupi.springbootinit.model.entity.BlogTag;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.model.vo.blog.BlogCategoryVO;
import com.yupi.springbootinit.model.vo.blog.BlogPostVO;
import com.yupi.springbootinit.model.vo.blog.BlogPostNavVO;
import com.yupi.springbootinit.model.vo.blog.BlogTagVO;
import com.yupi.springbootinit.service.BlogPostService;
import com.yupi.springbootinit.utils.BlogHtmlSanitizer;
import com.yupi.springbootinit.utils.SqlUtils;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class BlogPostServiceImpl extends ServiceImpl<BlogPostMapper, BlogPost> implements BlogPostService {

    private static final String STATUS_DRAFT = "draft";
    private static final String STATUS_PUBLISHED = "published";
    private static final String STATUS_OFFLINE = "offline";
    private static final String VISIBILITY_PUBLIC = "public";
    private static final String VISIBILITY_LOGIN = "login";
    private static final String VISIBILITY_ADMIN = "admin";
    private static final String TAXONOMY_ENABLED = "enabled";
    private static final int MAX_CONTENT_LENGTH = 10 * 1024 * 1024;

    @Resource
    private BlogCategoryMapper blogCategoryMapper;

    @Resource
    private BlogBookMapper blogBookMapper;

    @Resource
    private BlogChapterMapper blogChapterMapper;

    @Resource
    private BlogTagMapper blogTagMapper;

    @Resource
    private BlogPostTagMapper blogPostTagMapper;

    @Resource
    private BlogPostRevisionMapper blogPostRevisionMapper;

    @Resource
    private ObjectMapper objectMapper;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Long addPost(BlogPostAddRequest request, User adminUser) {
        request.setCategoryId(resolveCategoryId(request.getChapterId(), request.getCategoryId()));
        validateRequest(request, null);
        BlogPost post = new BlogPost();
        applyRequest(post, request);
        post.setChapterSort(nextChapterSort(request.getChapterId()));
        post.setAuthorId(adminUser.getId());
        post.setStatus(STATUS_DRAFT);
        post.setVersion(1);
        boolean result = this.save(post);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        savePostTags(post.getId(), request.getTagIds());
        return post.getId();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean updatePost(BlogPostUpdateRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0 || request.getVersion() == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "文章 id 和 version 不能为空");
        }
        BlogPost existing = getValidPost(request.getId());
        if (!Objects.equals(existing.getVersion(), request.getVersion())) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "文章已在其他页面更新，请刷新后重试");
        }
        request.setCategoryId(resolveCategoryId(request.getChapterId(), request.getCategoryId()));
        validateRequest(request, existing.getId());
        Long oldChapterId = existing.getChapterId();
        applyRequest(existing, request);
        if (!Objects.equals(oldChapterId, request.getChapterId())) {
            existing.setChapterSort(nextChapterSort(request.getChapterId()));
        }
        // Saving always creates a draft. This prevents edits to a published post from becoming public
        // before the administrator explicitly publishes the new revision.
        existing.setStatus(STATUS_DRAFT);
        int currentVersion = existing.getVersion() == null ? 1 : existing.getVersion();
        existing.setVersion(currentVersion + 1);
        boolean result = this.update(existing, new QueryWrapper<BlogPost>()
                .eq("id", existing.getId())
                .eq("version", currentVersion)
                .eq("isDelete", 0));
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR, "文章已被更新，请刷新后重试");
        savePostTags(existing.getId(), request.getTagIds());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean deletePost(Long id) {
        BlogPost post = getValidPost(id);
        blogPostTagMapper.delete(new QueryWrapper<BlogPostTag>().eq("postId", post.getId()));
        blogPostRevisionMapper.delete(new QueryWrapper<BlogPostRevision>().eq("postId", post.getId()));
        boolean result = this.removeById(post.getId());
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Boolean publishPost(Long id, User adminUser) {
        BlogPost post = getValidPost(id);
        validatePublishable(post);
        Date now = new Date();
        BlogPost update = new BlogPost();
        update.setId(post.getId());
        update.setStatus(STATUS_PUBLISHED);
        update.setPublishedAt(now);
        update.setVersion((post.getVersion() == null ? 1 : post.getVersion()) + 1);
        boolean result = this.updateById(update);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        saveRevision(post, adminUser.getId());
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Integer batchPublishPosts(List<Long> ids, User adminUser) {
        List<Long> normalizedIds = normalizeBatchIds(ids);
        List<BlogPost> posts = getValidPosts(normalizedIds);
        List<BlogPost> pendingPosts = posts.stream()
                .filter(post -> !STATUS_PUBLISHED.equals(post.getStatus()))
                .collect(Collectors.toList());
        for (BlogPost post : pendingPosts) {
            try {
                validatePublishable(post);
            } catch (BusinessException e) {
                throw new BusinessException(e.getCode(), String.format("文章《%s》无法发布：%s", post.getTitle(), e.getMessage()));
            }
        }
        Date now = new Date();
        for (BlogPost post : pendingPosts) {
            BlogPost update = new BlogPost();
            update.setId(post.getId());
            update.setStatus(STATUS_PUBLISHED);
            update.setPublishedAt(now);
            update.setVersion((post.getVersion() == null ? 1 : post.getVersion()) + 1);
            boolean result = this.updateById(update);
            ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
            saveRevision(post, adminUser.getId());
        }
        return pendingPosts.size();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Integer batchDeletePosts(List<Long> ids) {
        List<Long> normalizedIds = normalizeBatchIds(ids);
        getValidPosts(normalizedIds);
        blogPostTagMapper.delete(new QueryWrapper<BlogPostTag>().in("postId", normalizedIds));
        blogPostRevisionMapper.delete(new QueryWrapper<BlogPostRevision>().in("postId", normalizedIds));
        boolean result = this.removeByIds(normalizedIds);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return normalizedIds.size();
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Integer batchSetMemberOnly(List<Long> ids, Integer memberOnly) {
        if (memberOnly == null || (memberOnly != 0 && memberOnly != 1)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "会员专享只能设置为是或否");
        }
        List<Long> normalizedIds = normalizeBatchIds(ids);
        List<Long> changedIds = getValidPosts(normalizedIds).stream()
                .filter(post -> !Objects.equals(memberOnly, post.getMemberOnly()))
                .map(BlogPost::getId)
                .collect(Collectors.toList());
        if (changedIds.isEmpty()) {
            return 0;
        }
        boolean result = this.update(new UpdateWrapper<BlogPost>()
                .in("id", changedIds)
                .eq("isDelete", 0)
                .set("memberOnly", memberOnly)
                .setSql("version = version + 1"));
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return changedIds.size();
    }

    @Override
    public Boolean offlinePost(Long id) {
        BlogPost post = getValidPost(id);
        BlogPost update = new BlogPost();
        update.setId(post.getId());
        update.setStatus(STATUS_OFFLINE);
        update.setVersion((post.getVersion() == null ? 1 : post.getVersion()) + 1);
        boolean result = this.updateById(update);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    public Page<BlogPostVO> listAdminPosts(BlogPostQueryRequest request) {
        BlogPostQueryRequest safeRequest = request == null ? new BlogPostQueryRequest() : request;
        QueryWrapper<BlogPost> wrapper = buildBaseQuery(safeRequest);
        applyTagFilter(wrapper, safeRequest.getTagId());
        wrapper.select("id", "authorId", "categoryId", "chapterId", "chapterSort", "title", "slug", "summary", "coverUrl",
                "contentSchemaVersion", "status", "visibility", "memberOnly", "seoTitle", "seoDescription", "publishedAt",
                "version", "createTime", "updateTime");
        applySort(wrapper, safeRequest, false);
        Page<BlogPost> page = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), wrapper);
        return toVOPage(page);
    }

    @Override
    public BlogPostVO getAdminPost(Long id) {
        return toVOList(Collections.singletonList(getValidPost(id))).get(0);
    }

    @Override
    public Page<BlogPostVO> listPublishedPosts(BlogPostQueryRequest request, User loginUser) {
        BlogPostQueryRequest safeRequest = request == null ? new BlogPostQueryRequest() : request;
        QueryWrapper<BlogPost> wrapper = buildBaseQuery(safeRequest);
        wrapper.eq("status", STATUS_PUBLISHED).le("publishedAt", new Date());
        applyVisibility(wrapper, loginUser);
        applyEnabledBookFilter(wrapper);
        applyTagFilter(wrapper, safeRequest.getTagId());
        wrapper.select("id", "authorId", "categoryId", "chapterId", "chapterSort", "title", "slug", "summary", "coverUrl",
                "contentSchemaVersion", "status", "visibility", "memberOnly", "seoTitle", "seoDescription", "publishedAt",
                "version", "createTime", "updateTime");
        applySort(wrapper, safeRequest, true);
        Page<BlogPost> page = this.page(new Page<>(safeRequest.getCurrent(), safeRequest.getPageSize()), wrapper);
        Page<BlogPostVO> voPage = toVOPage(page);
        applyMemberAccess(voPage.getRecords(), loginUser);
        return voPage;
    }

    @Override
    public BlogPostVO getPublishedPost(String slug, User loginUser) {
        if (StringUtils.isBlank(slug)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        QueryWrapper<BlogPost> wrapper = new QueryWrapper<BlogPost>()
                .eq("slug", slug.trim().toLowerCase())
                .eq("status", STATUS_PUBLISHED)
                .eq("isDelete", 0)
                .le("publishedAt", new Date());
        applyVisibility(wrapper, loginUser);
        wrapper.last("LIMIT 1");
        BlogPost post = this.getOne(wrapper);
        ThrowUtils.throwIf(post == null, ErrorCode.NOT_FOUND_ERROR);
        validateEnabledBook(post);
        validateMemberAccess(post, loginUser);
        BlogPostVO vo = toVOList(Collections.singletonList(post)).get(0);
        vo.setCanAccess(true);
        applyNavigation(vo, loginUser);
        return vo;
    }

    @Override
    public List<BlogPostVO> listAdminPostsByChapterIds(List<Long> chapterIds) {
        if (chapterIds == null || chapterIds.isEmpty()) {
            return Collections.emptyList();
        }
        List<BlogPost> posts = this.list(new QueryWrapper<BlogPost>()
                .in("chapterId", chapterIds).eq("isDelete", 0)
                .orderByAsc("chapterSort").orderByAsc("id"));
        return toVOList(posts);
    }

    @Override
    public List<BlogPostVO> listPublishedPostsByChapterIds(List<Long> chapterIds, User loginUser) {
        if (chapterIds == null || chapterIds.isEmpty()) {
            return Collections.emptyList();
        }
        QueryWrapper<BlogPost> wrapper = new QueryWrapper<BlogPost>()
                .in("chapterId", chapterIds).eq("isDelete", 0)
                .eq("status", STATUS_PUBLISHED).le("publishedAt", new Date())
                .orderByAsc("chapterSort").orderByAsc("id");
        applyVisibility(wrapper, loginUser);
        wrapper.select("id", "authorId", "categoryId", "chapterId", "chapterSort", "title", "slug", "summary", "coverUrl",
                "contentSchemaVersion", "status", "visibility", "memberOnly", "seoTitle", "seoDescription", "publishedAt",
                "version", "createTime", "updateTime");
        List<BlogPostVO> posts = toVOList(this.list(wrapper));
        applyMemberAccess(posts, loginUser);
        return posts;
    }

    private QueryWrapper<BlogPost> buildBaseQuery(BlogPostQueryRequest request) {
        QueryWrapper<BlogPost> wrapper = new QueryWrapper<>();
        wrapper.eq("isDelete", 0)
                .eq(request.getCategoryId() != null, "categoryId", request.getCategoryId())
                .eq(request.getChapterId() != null, "chapterId", request.getChapterId())
                .isNull(Boolean.TRUE.equals(request.getStandaloneOnly()), "chapterId")
                .eq(StringUtils.isNotBlank(request.getStatus()), "status", request.getStatus())
                .eq(StringUtils.isNotBlank(request.getVisibility()), "visibility", request.getVisibility())
                .eq(request.getMemberOnly() != null, "memberOnly", request.getMemberOnly());
        if (request.getBookId() != null) {
            List<Long> chapterIds = blogChapterMapper.selectList(new QueryWrapper<BlogChapter>()
                    .eq("bookId", request.getBookId()).eq("isDelete", 0)).stream()
                    .map(BlogChapter::getId).collect(Collectors.toList());
            if (chapterIds.isEmpty()) {
                wrapper.eq("id", -1L);
            } else {
                wrapper.in("chapterId", chapterIds);
            }
        }
        if (StringUtils.isNotBlank(request.getKeyword())) {
            String keyword = request.getKeyword().trim();
            wrapper.and(w -> w.like("title", keyword).or().like("summary", keyword));
        }
        return wrapper;
    }

    private void applyTagFilter(QueryWrapper<BlogPost> wrapper, Long tagId) {
        if (tagId == null) {
            return;
        }
        List<Long> postIds = blogPostTagMapper.selectList(new QueryWrapper<BlogPostTag>().eq("tagId", tagId))
                .stream().map(BlogPostTag::getPostId).distinct().collect(Collectors.toList());
        if (postIds.isEmpty()) {
            wrapper.eq("id", -1L);
        } else {
            wrapper.in("id", postIds);
        }
    }

    private void applyVisibility(QueryWrapper<BlogPost> wrapper, User loginUser) {
        if (loginUser != null && UserConstant.ADMIN_ROLE.equals(loginUser.getUserRole())) {
            return;
        }
        if (loginUser == null) {
            wrapper.eq("visibility", VISIBILITY_PUBLIC);
        } else {
            wrapper.in("visibility", VISIBILITY_PUBLIC, VISIBILITY_LOGIN);
        }
    }

    private void applyEnabledBookFilter(QueryWrapper<BlogPost> wrapper) {
        List<Long> disabledBookIds = blogBookMapper.selectList(new QueryWrapper<BlogBook>()
                .eq("status", "disabled").eq("isDelete", 0)).stream()
                .map(BlogBook::getId).collect(Collectors.toList());
        if (disabledBookIds.isEmpty()) {
            return;
        }
        List<Long> disabledChapterIds = blogChapterMapper.selectList(new QueryWrapper<BlogChapter>()
                .in("bookId", disabledBookIds).eq("isDelete", 0)).stream()
                .map(BlogChapter::getId).collect(Collectors.toList());
        if (!disabledChapterIds.isEmpty()) {
            wrapper.and(w -> w.isNull("chapterId").or().notIn("chapterId", disabledChapterIds));
        }
    }

    private void applySort(QueryWrapper<BlogPost> wrapper, BlogPostQueryRequest request, boolean publicList) {
        if (SqlUtils.validSortField(request.getSortField())) {
            wrapper.orderBy(true, "ascend".equals(request.getSortOrder()), request.getSortField());
        }
        if (publicList) {
            wrapper.orderByDesc("publishedAt");
        } else {
            wrapper.orderByDesc("updateTime");
        }
        wrapper.orderByDesc("id");
    }

    private void validateRequest(BlogPostAddRequest request, Long excludeId) {
        if (request == null || StringUtils.isBlank(request.getTitle()) || request.getTitle().trim().length() > 255) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "文章标题不能为空且不能超过 255 字");
        }
        String slug = request.getSlug();
        if (StringUtils.isBlank(slug) || slug.length() > 160
                || !slug.matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "slug 仅支持小写字母、数字和中划线");
        }
        QueryWrapper<BlogPost> duplicate = new QueryWrapper<BlogPost>()
                .eq("slug", slug.trim().toLowerCase()).eq("isDelete", 0);
        duplicate.ne(excludeId != null, "id", excludeId);
        ThrowUtils.throwIf(this.count(duplicate) > 0, ErrorCode.PARAMS_ERROR, "文章 slug 已存在");
        if (request.getSummary() != null && request.getSummary().length() > 1000) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "文章摘要不能超过 1000 字");
        }
        if (request.getSeoDescription() != null && request.getSeoDescription().length() > 512) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "SEO 描述不能超过 512 字");
        }
        validateContentJson(request.getContentJson());
        validateTaxonomy(request.getCategoryId(), request.getTagIds());
        validateVisibility(request.getVisibility());
        validateMemberOnly(request.getMemberOnly());
        validateHttpsUrl(request.getCoverUrl(), "封面地址");
    }

    private void validateContentJson(String contentJson) {
        if (StringUtils.isBlank(contentJson) || contentJson.length() > MAX_CONTENT_LENGTH) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "正文不能为空且不能超过 10MB");
        }
        try {
            JsonNode root = objectMapper.readTree(contentJson);
            if (root == null || !"doc".equals(root.path("type").asText()) || !root.path("content").isArray()) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "正文不是合法的 Tiptap JSON");
            }
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "正文 JSON 格式错误");
        }
    }

    private void validateTaxonomy(Long categoryId, List<Long> tagIds) {
        if (categoryId == null || categoryId <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "请选择博客分类");
        }
        BlogCategory category = blogCategoryMapper.selectById(categoryId);
        ThrowUtils.throwIf(category == null || !TAXONOMY_ENABLED.equals(category.getStatus()),
                ErrorCode.PARAMS_ERROR, "博客分类不存在或已停用");
        Set<Long> uniqueTagIds = normalizeTagIds(tagIds);
        if (uniqueTagIds.isEmpty()) {
            return;
        }
        List<BlogTag> tags = blogTagMapper.selectBatchIds(uniqueTagIds);
        boolean invalid = tags.size() != uniqueTagIds.size()
                || tags.stream().anyMatch(tag -> !TAXONOMY_ENABLED.equals(tag.getStatus()));
        ThrowUtils.throwIf(invalid, ErrorCode.PARAMS_ERROR, "博客标签不存在或已停用");
    }

    private void validateVisibility(String visibility) {
        String safeVisibility = StringUtils.defaultIfBlank(visibility, VISIBILITY_PUBLIC);
        if (!VISIBILITY_PUBLIC.equals(safeVisibility) && !VISIBILITY_LOGIN.equals(safeVisibility)
                && !VISIBILITY_ADMIN.equals(safeVisibility)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "文章可见性不合法");
        }
    }

    private void validateHttpsUrl(String value, String fieldName) {
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
            throw new BusinessException(ErrorCode.PARAMS_ERROR, fieldName + "必须是 HTTPS 地址");
        }
    }

    private void applyRequest(BlogPost post, BlogPostAddRequest request) {
        post.setCategoryId(request.getCategoryId());
        post.setChapterId(request.getChapterId());
        post.setTitle(request.getTitle().trim());
        post.setSlug(request.getSlug().trim().toLowerCase());
        post.setSummary(StringUtils.trimToEmpty(request.getSummary()));
        post.setCoverUrl(StringUtils.trimToEmpty(request.getCoverUrl()));
        post.setContentJson(request.getContentJson());
        post.setContentHtml(BlogHtmlSanitizer.sanitize(request.getContentHtml()));
        post.setContentSchemaVersion(request.getContentSchemaVersion() == null ? 1 : request.getContentSchemaVersion());
        post.setVisibility(StringUtils.defaultIfBlank(request.getVisibility(), VISIBILITY_PUBLIC));
        post.setMemberOnly(request.getMemberOnly() == null ? 0 : request.getMemberOnly());
        post.setSeoTitle(StringUtils.trimToEmpty(request.getSeoTitle()));
        post.setSeoDescription(StringUtils.trimToEmpty(request.getSeoDescription()));
    }

    private void savePostTags(Long postId, List<Long> tagIds) {
        blogPostTagMapper.delete(new QueryWrapper<BlogPostTag>().eq("postId", postId));
        for (Long tagId : normalizeTagIds(tagIds)) {
            BlogPostTag relation = new BlogPostTag();
            relation.setPostId(postId);
            relation.setTagId(tagId);
            blogPostTagMapper.insert(relation);
        }
    }

    private Set<Long> normalizeTagIds(List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return Collections.emptySet();
        }
        return tagIds.stream().filter(Objects::nonNull).filter(id -> id > 0)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private void validatePublishable(BlogPost post) {
        validateContentJson(post.getContentJson());
        try {
            ThrowUtils.throwIf(!hasPublishableContent(objectMapper.readTree(post.getContentJson())),
                    ErrorCode.PARAMS_ERROR, "文章正文为空，不能发布");
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "正文 JSON 格式错误");
        }
        validateTaxonomy(post.getCategoryId(), getTagIds(post.getId()));
        ThrowUtils.throwIf(StringUtils.isBlank(post.getContentHtml()), ErrorCode.PARAMS_ERROR,
                "文章渲染内容为空，不能发布");
    }

    private void validateMemberOnly(Integer memberOnly) {
        if (memberOnly != null && memberOnly != 0 && memberOnly != 1) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "会员专享只能设置为是或否");
        }
    }

    private void validateMemberAccess(BlogPost post, User loginUser) {
        if (post.getMemberOnly() == null || post.getMemberOnly() == 0
                || (loginUser != null && UserConstant.ADMIN_ROLE.equals(loginUser.getUserRole()))) {
            return;
        }
        if (!hasActiveMembership(loginUser)) {
            throw new BusinessException(ErrorCode.FORBIDDEN_ERROR, "会员专享文章，请开通会员后查看");
        }
    }

    private void applyMemberAccess(List<BlogPostVO> posts, User loginUser) {
        boolean activeMember = hasActiveMembership(loginUser);
        boolean admin = loginUser != null && UserConstant.ADMIN_ROLE.equals(loginUser.getUserRole());
        posts.forEach(post -> post.setCanAccess(post.getMemberOnly() == null || post.getMemberOnly() == 0
                || activeMember || admin));
    }

    private boolean hasActiveMembership(User loginUser) {
        if (loginUser == null) {
            return false;
        }
        MemberLevelEnum level = MemberLevelEnum.getEnumByValue(loginUser.getMemberLevel());
        if (level == null || !level.canAccessMemberContent()) {
            return false;
        }
        Date expireTime = loginUser.getMemberExpireTime();
        return expireTime == null || expireTime.after(new Date());
    }

    private boolean hasPublishableContent(JsonNode node) {
        if (node == null || node.isMissingNode()) {
            return false;
        }
        String type = node.path("type").asText();
        if ("text".equals(type) && StringUtils.isNotBlank(node.path("text").asText())) {
            return true;
        }
        if (("image".equals(type) || "video".equals(type)) && StringUtils.isNotBlank(node.path("attrs").path("src").asText())) {
            return true;
        }
        JsonNode content = node.path("content");
        if (content.isArray()) {
            java.util.Iterator<JsonNode> children = content.elements();
            while (children.hasNext()) {
                if (hasPublishableContent(children.next())) {
                    return true;
                }
            }
        }
        return false;
    }

    private void saveRevision(BlogPost post, Long userId) {
        BlogPostRevision latest = blogPostRevisionMapper.selectOne(new QueryWrapper<BlogPostRevision>()
                .eq("postId", post.getId()).orderByDesc("revisionNo").last("LIMIT 1"));
        BlogPostRevision revision = new BlogPostRevision();
        revision.setPostId(post.getId());
        revision.setRevisionNo(latest == null ? 1 : latest.getRevisionNo() + 1);
        revision.setTitle(post.getTitle());
        revision.setSummary(post.getSummary());
        revision.setCoverUrl(post.getCoverUrl());
        revision.setContentJson(post.getContentJson());
        revision.setContentHtml(post.getContentHtml());
        revision.setCreatedBy(userId);
        blogPostRevisionMapper.insert(revision);
    }

    private BlogPost getValidPost(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        BlogPost post = this.getOne(new QueryWrapper<BlogPost>().eq("id", id).eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(post == null, ErrorCode.NOT_FOUND_ERROR);
        return post;
    }

    private List<Long> normalizeBatchIds(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "请选择至少一篇文章");
        }
        if (ids.size() > 100) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "每次最多操作 100 篇文章");
        }
        if (ids.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "文章 id 不正确");
        }
        List<Long> normalizedIds = new ArrayList<>(new LinkedHashSet<>(ids));
        if (normalizedIds.size() != ids.size()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "文章 id 不能重复");
        }
        return normalizedIds;
    }

    private List<BlogPost> getValidPosts(List<Long> ids) {
        List<BlogPost> posts = this.list(new QueryWrapper<BlogPost>()
                .in("id", ids)
                .eq("isDelete", 0));
        if (posts.size() != ids.size()) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR, "部分文章不存在或已删除，请刷新后重试");
        }
        Map<Long, BlogPost> postMap = posts.stream()
                .collect(Collectors.toMap(BlogPost::getId, Function.identity()));
        return ids.stream().map(postMap::get).collect(Collectors.toList());
    }

    private Long resolveCategoryId(Long chapterId, Long requestedCategoryId) {
        if (chapterId == null) {
            return requestedCategoryId;
        }
        BlogChapter chapter = blogChapterMapper.selectOne(new QueryWrapper<BlogChapter>()
                .eq("id", chapterId).eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(chapter == null, ErrorCode.PARAMS_ERROR, "教程章节不存在");
        BlogBook book = blogBookMapper.selectOne(new QueryWrapper<BlogBook>()
                .eq("id", chapter.getBookId()).eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.PARAMS_ERROR, "教程书不存在");
        return book.getCategoryId();
    }

    private Integer nextChapterSort(Long chapterId) {
        if (chapterId == null) {
            return 0;
        }
        BlogPost last = this.getOne(new QueryWrapper<BlogPost>()
                .eq("chapterId", chapterId).eq("isDelete", 0)
                .orderByDesc("chapterSort").orderByDesc("id").last("LIMIT 1"));
        return last == null ? 0 : last.getChapterSort() + 10;
    }

    private void validateEnabledBook(BlogPost post) {
        if (post.getChapterId() == null) {
            return;
        }
        BlogChapter chapter = blogChapterMapper.selectOne(new QueryWrapper<BlogChapter>()
                .eq("id", post.getChapterId()).eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(chapter == null, ErrorCode.NOT_FOUND_ERROR);
        BlogBook book = blogBookMapper.selectOne(new QueryWrapper<BlogBook>()
                .eq("id", chapter.getBookId()).eq("status", "enabled")
                .eq("isDelete", 0).last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.NOT_FOUND_ERROR);
    }

    private Page<BlogPostVO> toVOPage(Page<BlogPost> page) {
        Page<BlogPostVO> voPage = new Page<>(page.getCurrent(), page.getSize(), page.getTotal());
        voPage.setRecords(toVOList(page.getRecords()));
        return voPage;
    }

    private List<BlogPostVO> toVOList(List<BlogPost> posts) {
        if (posts == null || posts.isEmpty()) {
            return Collections.emptyList();
        }
        Set<Long> categoryIds = posts.stream().map(BlogPost::getCategoryId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, BlogCategory> categoryMap = categoryIds.isEmpty() ? Collections.emptyMap()
                : blogCategoryMapper.selectBatchIds(categoryIds).stream()
                        .collect(Collectors.toMap(BlogCategory::getId, Function.identity(), (a, b) -> a));
        Set<Long> chapterIds = posts.stream().map(BlogPost::getChapterId).filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, BlogChapter> chapterMap = chapterIds.isEmpty() ? Collections.emptyMap()
                : blogChapterMapper.selectBatchIds(chapterIds).stream()
                        .collect(Collectors.toMap(BlogChapter::getId, Function.identity(), (a, b) -> a));
        Set<Long> bookIds = chapterMap.values().stream().map(BlogChapter::getBookId).collect(Collectors.toSet());
        Map<Long, BlogBook> bookMap = bookIds.isEmpty() ? Collections.emptyMap()
                : blogBookMapper.selectBatchIds(bookIds).stream()
                        .collect(Collectors.toMap(BlogBook::getId, Function.identity(), (a, b) -> a));
        List<Long> postIds = posts.stream().map(BlogPost::getId).collect(Collectors.toList());
        List<BlogPostTag> relations = blogPostTagMapper.selectList(
                new QueryWrapper<BlogPostTag>().in("postId", postIds).orderByAsc("id"));
        Map<Long, List<BlogPostTag>> relationMap = relations.stream()
                .collect(Collectors.groupingBy(BlogPostTag::getPostId));
        Set<Long> tagIds = relations.stream().map(BlogPostTag::getTagId).collect(Collectors.toSet());
        Map<Long, BlogTag> tagMap = tagIds.isEmpty() ? Collections.emptyMap()
                : blogTagMapper.selectBatchIds(tagIds).stream()
                        .collect(Collectors.toMap(BlogTag::getId, Function.identity(), (a, b) -> a));
        List<BlogPostVO> result = new ArrayList<>();
        for (BlogPost post : posts) {
            BlogPostVO vo = new BlogPostVO();
            BeanUtils.copyProperties(post, vo);
            BlogCategory category = categoryMap.get(post.getCategoryId());
            if (category != null) {
                BlogCategoryVO categoryVO = new BlogCategoryVO();
                BeanUtils.copyProperties(category, categoryVO);
                vo.setCategory(categoryVO);
            }
            BlogChapter chapter = chapterMap.get(post.getChapterId());
            if (chapter != null) {
                vo.setChapterTitle(chapter.getTitle());
                BlogBook book = bookMap.get(chapter.getBookId());
                if (book != null) {
                    vo.setBookId(book.getId());
                    vo.setBookTitle(book.getTitle());
                    vo.setBookSlug(book.getSlug());
                }
            }
            List<BlogTagVO> tagVOs = relationMap.getOrDefault(post.getId(), Collections.emptyList()).stream()
                    .map(relation -> tagMap.get(relation.getTagId()))
                    .filter(Objects::nonNull)
                    .map(tag -> {
                        BlogTagVO tagVO = new BlogTagVO();
                        BeanUtils.copyProperties(tag, tagVO);
                        return tagVO;
                    }).collect(Collectors.toList());
            vo.setTags(tagVOs);
            result.add(vo);
        }
        return result;
    }

    private void applyNavigation(BlogPostVO current, User loginUser) {
        if (current.getBookId() == null) {
            return;
        }
        List<BlogChapter> chapters = blogChapterMapper.selectList(new QueryWrapper<BlogChapter>()
                .eq("bookId", current.getBookId()).eq("isDelete", 0)
                .orderByAsc("sort").orderByAsc("id"));
        if (chapters.isEmpty()) {
            return;
        }
        Map<Long, Integer> chapterOrder = new java.util.HashMap<>();
        for (int i = 0; i < chapters.size(); i++) {
            chapterOrder.put(chapters.get(i).getId(), i);
        }
        QueryWrapper<BlogPost> wrapper = new QueryWrapper<BlogPost>()
                .in("chapterId", chapterOrder.keySet()).eq("isDelete", 0)
                .eq("status", STATUS_PUBLISHED).le("publishedAt", new Date());
        applyVisibility(wrapper, loginUser);
        List<BlogPost> ordered = this.list(wrapper);
        ordered.sort(Comparator
                .comparing((BlogPost item) -> chapterOrder.getOrDefault(item.getChapterId(), Integer.MAX_VALUE))
                .thenComparing(BlogPost::getChapterSort, Comparator.nullsFirst(Integer::compareTo))
                .thenComparing(BlogPost::getId));
        for (int i = 0; i < ordered.size(); i++) {
            if (!Objects.equals(ordered.get(i).getId(), current.getId())) {
                continue;
            }
            if (i > 0) {
                current.setPreviousPost(toNavVO(ordered.get(i - 1)));
            }
            if (i + 1 < ordered.size()) {
                current.setNextPost(toNavVO(ordered.get(i + 1)));
            }
            return;
        }
    }

    private BlogPostNavVO toNavVO(BlogPost post) {
        BlogPostNavVO vo = new BlogPostNavVO();
        vo.setId(post.getId());
        vo.setTitle(post.getTitle());
        vo.setSlug(post.getSlug());
        return vo;
    }

    private List<Long> getTagIds(Long postId) {
        return blogPostTagMapper.selectList(new QueryWrapper<BlogPostTag>().eq("postId", postId)).stream()
                .map(BlogPostTag::getTagId).collect(Collectors.toList());
    }
}
