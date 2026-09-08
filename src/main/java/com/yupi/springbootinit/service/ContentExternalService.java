package com.yupi.springbootinit.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.artwork.ArtworkAddRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkQueryRequest;
import com.yupi.springbootinit.model.dto.artwork.ArtworkUpdateRequest;
import com.yupi.springbootinit.model.dto.blog.BlogBookQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogBookSaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogChapterSaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostAddRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostUpdateRequest;
import com.yupi.springbootinit.model.dto.community.CommunityRequests;
import com.yupi.springbootinit.model.dto.contentapi.ContentResourceQuery;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetAddRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetQueryRequest;
import com.yupi.springbootinit.model.dto.promptasset.PromptAssetUpdateRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundAddRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundQueryRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundUpdateRequest;
import com.yupi.springbootinit.model.entity.Artwork;
import com.yupi.springbootinit.model.entity.BlogBook;
import com.yupi.springbootinit.model.entity.BlogChapter;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.entity.ContentApiKey;
import com.yupi.springbootinit.model.entity.ContentModuleDraftBridge;
import com.yupi.springbootinit.model.entity.PromptAsset;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.VideoBackground;
import com.yupi.springbootinit.model.enums.ArtworkStatusEnum;
import com.yupi.springbootinit.model.vo.contentapi.ContentResourceVO;
import com.yupi.springbootinit.model.vo.artwork.ArtworkVO;
import com.yupi.springbootinit.model.vo.blog.BlogPostVO;
import com.yupi.springbootinit.model.vo.promptasset.PromptAssetVO;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundVO;
import com.yupi.springbootinit.service.community.CommunityPostService;
import com.yupi.springbootinit.service.community.CommunityTaxonomyService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Direct, key-authenticated content API. It reuses the existing module services and always creates drafts.
 * Published rows that do not have native draft revisions are deliberately protected from direct updates.
 */
@Service
public class ContentExternalService {

    public static final String ARTWORK = "artwork";
    public static final String PROMPT_ASSET = "prompt_asset";
    public static final String VIDEO_BACKGROUND = "video_background";
    public static final String COMMUNITY_POST = "community_post";
    public static final String TUTORIAL_BOOK = "tutorial_book";
    public static final String TUTORIAL_CHAPTER = "tutorial_chapter";
    public static final String TUTORIAL_POST = "tutorial_post";

    private static final Set<String> TYPES = Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(
            ARTWORK, PROMPT_ASSET, VIDEO_BACKGROUND, COMMUNITY_POST,
            TUTORIAL_BOOK, TUTORIAL_CHAPTER, TUTORIAL_POST)));
    private static final Set<String> BRIDGED_TYPES = Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(
            ARTWORK, PROMPT_ASSET, VIDEO_BACKGROUND, TUTORIAL_POST)));

    private static final Map<String, Set<String>> CREATE_WRITABLE = writableFields(true);
    private static final Map<String, Set<String>> UPDATE_WRITABLE = writableFields(false);

    @Resource private ObjectMapper objectMapper;
    @Resource private JdbcTemplate jdbcTemplate;
    @Resource private UserService userService;
    @Resource private ArtworkService artworkService;
    @Resource private PromptAssetService promptAssetService;
    @Resource private VideoBackgroundService videoBackgroundService;
    @Resource private BlogPostService blogPostService;
    @Resource private BlogBookService blogBookService;
    @Resource private BlogCategoryService blogCategoryService;
    @Resource private BlogTagService blogTagService;
    @Resource private CategoryService categoryService;
    @Resource private TagService tagService;
    @Resource private CommunityPostService communityPostService;
    @Resource private CommunityTaxonomyService communityTaxonomyService;
    @Resource private ContentMarkdownService contentMarkdownService;
    @Resource private ContentModuleDraftBridgeService draftBridgeService;

    public Set<String> resourceTypes() {
        return TYPES;
    }

    public String requiredScope(String type, String operation) {
        requireType(type);
        String group = type.startsWith("tutorial_") ? "tutorial" : type;
        if (!Arrays.asList("read", "add", "update", "upload").contains(operation)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "不支持的内容操作: " + operation);
        }
        return group + ":" + operation;
    }

    public User requireOperator(ContentApiKey key) {
        if (key == null || key.getCreateUserId() == null) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "API 密钥没有有效创建人，请在后台重新创建密钥");
        }
        User operator = userService.getById(key.getCreateUserId());
        if (operator == null || !userService.isAdmin(operator)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "API 密钥创建人已失效或不再是管理员");
        }
        return operator;
    }

    public Map<String, Object> capabilities(ContentApiKey key) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("apiVersion", "v1");
        result.put("authenticationHeader", ContentApiKeyService.HEADER_CONTENT_ASSET_KEY);
        result.put("scopes", splitScopes(key == null ? null : key.getScopes()));
        Map<String, Object> resources = new LinkedHashMap<>();
        for (String type : TYPES) {
            Map<String, Object> contract = new LinkedHashMap<>();
            contract.put("operations", Arrays.asList("read", "add", "update"));
            contract.put("createFields", CREATE_WRITABLE.get(type));
            contract.put("updateFields", UPDATE_WRITABLE.get(type));
            contract.put("newStatus", draftLabel(type));
            contract.put("publishedUpdate", COMMUNITY_POST.equals(type)
                    ? "supported: the existing published revision stays online"
                    : BRIDGED_TYPES.contains(type)
                    ? "supported: a native draft clone is reviewed and published in the original module"
                    : "temporarily rejected until the tutorial structure draft bridge is installed");
            resources.put(type, contract);
        }
        result.put("resources", resources);
        result.put("taxonomyRead", Arrays.asList("siteCategories", "siteTags", "blogCategories", "blogTags",
                "communityCategories", "communityTags"));
        result.put("publishByApiKey", false);
        return result;
    }

    public Object list(String type, ContentResourceQuery query, User operator) {
        requireType(type);
        ContentResourceQuery q = normalizeQuery(query);
        switch (type) {
            case ARTWORK:
                ArtworkQueryRequest artwork = new ArtworkQueryRequest();
                copyPage(q, artwork); artwork.setSearchText(q.getKeyword()); artwork.setCategoryId(q.getCategoryId());
                artwork.setTagIdList(q.getTagIdList()); artwork.setMemberOnly(q.getMemberOnly());
                artwork.setStatus(integerStatus(q.getStatus()));
                Page<ArtworkVO> artworkPage = artworkService.listArtworkVOByPage(artwork, operator, true);
                draftBridgeService.annotateAdminResources(type, artworkPage.getRecords());
                return artworkPage;
            case PROMPT_ASSET:
                PromptAssetQueryRequest prompt = new PromptAssetQueryRequest();
                copyPage(q, prompt); prompt.setSearchText(q.getKeyword()); prompt.setCategoryId(q.getCategoryId());
                prompt.setTagIdList(q.getTagIdList()); prompt.setMemberOnly(q.getMemberOnly());
                prompt.setAssetType(q.getAssetType()); prompt.setStatus(integerStatus(q.getStatus()));
                Page<PromptAssetVO> promptPage = promptAssetService.listPromptAssetVOByPage(prompt);
                draftBridgeService.annotateAdminResources(type, promptPage.getRecords());
                return promptPage;
            case VIDEO_BACKGROUND:
                VideoBackgroundQueryRequest video = new VideoBackgroundQueryRequest();
                copyPage(q, video); video.setSearchText(q.getKeyword()); video.setCategoryId(q.getCategoryId());
                video.setTagIdList(q.getTagIdList()); video.setMemberOnly(q.getMemberOnly());
                video.setStatus(integerStatus(q.getStatus()));
                Page<VideoBackgroundVO> videoPage = videoBackgroundService.listVideoBackgroundVOByPage(video, operator, true);
                draftBridgeService.annotateAdminResources(type, videoPage.getRecords());
                return videoPage;
            case COMMUNITY_POST:
                CommunityRequests.Query community = new CommunityRequests.Query();
                community.setCurrent((int) q.getCurrent()); community.setPageSize((int) q.getPageSize());
                community.setKeyword(q.getKeyword()); community.setCategoryId(q.getCategoryId());
                community.setTagId(q.getTagId()); community.setStatus(q.getStatus());
                return communityPostService.list(community, true);
            case TUTORIAL_BOOK:
                BlogBookQueryRequest book = new BlogBookQueryRequest();
                copyPage(q, book); book.setKeyword(q.getKeyword()); book.setCategoryId(q.getCategoryId());
                book.setStatus(q.getStatus());
                return blogBookService.listAdminBooks(book);
            case TUTORIAL_CHAPTER:
                List<?> chapters = blogBookService.listChapters(q.getBookId());
                return page(chapters, chapters.size(), 1, chapters.size());
            case TUTORIAL_POST:
                BlogPostQueryRequest post = new BlogPostQueryRequest();
                copyPage(q, post); post.setKeyword(q.getKeyword()); post.setCategoryId(q.getCategoryId());
                post.setBookId(q.getBookId()); post.setChapterId(q.getChapterId()); post.setTagId(q.getTagId());
                post.setStatus(q.getStatus()); post.setMemberOnly(q.getMemberOnly());
                Page<BlogPostVO> postPage = blogPostService.listAdminPosts(post);
                draftBridgeService.annotateAdminResources(type, postPage.getRecords());
                return postPage;
            default:
                throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
    }

    public ContentResourceVO get(String type, Long id, User operator) {
        requireType(type);
        ContentModuleDraftBridge byTarget = draftBridgeService.findByTarget(type, id);
        if (byTarget != null) {
            ContentResourceVO draft = getLive(type, byTarget.getDraftId(), operator);
            ObjectNode resource = draft.getResource().deepCopy();
            resource.put("pendingDraft", true);
            resource.put("draftResourceId", String.valueOf(byTarget.getDraftId()));
            resource.put("replacesResourceId", String.valueOf(byTarget.getTargetId()));
            draft.setId(String.valueOf(byTarget.getTargetId()));
            draft.setResource(resource);
            return draft;
        }
        ContentResourceVO result = getLive(type, id, operator);
        ContentModuleDraftBridge byDraft = draftBridgeService.findByDraft(type, id);
        if (byDraft != null) {
            ObjectNode resource = result.getResource().deepCopy();
            resource.put("pendingDraft", true);
            resource.put("draftResourceId", String.valueOf(byDraft.getDraftId()));
            resource.put("replacesResourceId", String.valueOf(byDraft.getTargetId()));
            result.setResource(resource);
        }
        return result;
    }

    public ContentResourceVO getLive(String type, Long id, User operator) {
        requireType(type);
        if (id == null || id <= 0) throw new BusinessException(ErrorCode.PARAMS_ERROR, "内容 ID 不合法");
        JsonNode resource;
        switch (type) {
            case ARTWORK:
                resource = objectMapper.valueToTree(artworkService.getArtworkDetail(id, operator, true)); break;
            case PROMPT_ASSET:
                resource = objectMapper.valueToTree(promptAssetService.getPromptAssetVO(id)); break;
            case VIDEO_BACKGROUND:
                VideoBackground video = videoBackgroundService.getById(id);
                if (video == null) throw notFound();
                ObjectNode videoNode = objectMapper.valueToTree(video);
                videoNode.set("tagIdList", longArray("video_background_tag", "videoBackgroundId", "tagId", id));
                resource = videoNode; break;
            case COMMUNITY_POST:
                resource = communityDraft(id); break;
            case TUTORIAL_BOOK:
                resource = objectMapper.valueToTree(blogBookService.getAdminBook(id)); break;
            case TUTORIAL_CHAPTER:
                resource = chapter(id); break;
            case TUTORIAL_POST:
                resource = objectMapper.valueToTree(blogPostService.getAdminPost(id)); break;
            default:
                throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return view(type, id, resource);
    }

    @Transactional(rollbackFor = Exception.class)
    public ContentResourceVO add(String type, JsonNode fields, User operator) {
        ObjectNode payload = validateFields(type, fields, true);
        Long id;
        switch (type) {
            case ARTWORK:
                ArtworkAddRequest artwork = convert(payload, ArtworkAddRequest.class);
                artwork.setStatus(ArtworkStatusEnum.DRAFT.getValue()); artwork.setApiSecret(null);
                if (StringUtils.isNotBlank(artwork.getExternalKey())
                        && artworkService.lambdaQuery().eq(Artwork::getExternalKey,
                        StringUtils.trim(artwork.getExternalKey())).one() != null) {
                    throw new BusinessException(ErrorCode.OPERATION_ERROR,
                            "externalKey 已存在，请查询对应作品后执行更新");
                }
                id = artworkService.addArtwork(artwork, operator); break;
            case PROMPT_ASSET:
                if (payload.has("tagIdList") && !payload.has("assetTagIdList")) {
                    payload.set("assetTagIdList", payload.get("tagIdList"));
                }
                payload.remove("tagIdList");
                PromptAssetAddRequest prompt = convert(payload, PromptAssetAddRequest.class);
                prompt.setStatus(0); prompt.setApiSecret(null);
                id = promptAssetService.addPromptAsset(prompt); break;
            case VIDEO_BACKGROUND:
                VideoBackgroundAddRequest video = convert(payload, VideoBackgroundAddRequest.class);
                video.setStatus(ArtworkStatusEnum.DRAFT.getValue());
                id = videoBackgroundService.addVideoBackground(video, operator); break;
            case COMMUNITY_POST:
                CommunityRequests.SavePost community = convert(payload, CommunityRequests.SavePost.class);
                community.setId(null); community.setVersion(null);
                id = number(communityPostService.save(community, operator.getId()).get("id")); break;
            case TUTORIAL_BOOK:
                BlogBookSaveRequest book = convert(payload, BlogBookSaveRequest.class);
                book.setId(null); book.setStatus("disabled");
                id = blogBookService.saveBook(book, operator); break;
            case TUTORIAL_CHAPTER:
                BlogChapterSaveRequest chapter = convert(payload, BlogChapterSaveRequest.class);
                chapter.setId(null); requireDisabledBook(chapter.getBookId());
                id = blogBookService.saveChapter(chapter); break;
            case TUTORIAL_POST:
                BlogPostAddRequest post = tutorialPost(payload, BlogPostAddRequest.class);
                post.setStatus("draft");
                id = blogPostService.addPost(post, operator); break;
            default:
                throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return get(type, id, operator);
    }

    @Transactional(rollbackFor = Exception.class)
    public ContentResourceVO update(String type, Long id, String baseVersion, JsonNode fields, User operator) {
        ContentModuleDraftBridge targetBridge = draftBridgeService.findByTarget(type, id);
        Long editId = targetBridge == null ? id : targetBridge.getDraftId();
        ContentResourceVO current = get(type, id, operator);
        verifyVersion(baseVersion, current.getVersion());
        ObjectNode patch = validateFields(type, fields, false);
        if (targetBridge == null && !COMMUNITY_POST.equals(type) && !isNativeDraft(type, current.getResource())) {
            if (BRIDGED_TYPES.contains(type)) {
                return createReplacementDraft(type, id, current, patch, operator);
            }
            requireNativeDraft(type, current.getResource());
        }
        ObjectNode merged = mergeWritable(type, current.getResource(), patch);
        switch (type) {
            case ARTWORK:
                ArtworkUpdateRequest artwork = convert(merged, ArtworkUpdateRequest.class);
                artwork.setId(editId); artwork.setStatus(ArtworkStatusEnum.DRAFT.getValue()); artwork.setApiSecret(null);
                artworkService.updateArtwork(artwork, operator); break;
            case PROMPT_ASSET:
                PromptAssetUpdateRequest prompt = convert(merged, PromptAssetUpdateRequest.class);
                prompt.setId(editId); prompt.setStatus(0); prompt.setApiSecret(null);
                promptAssetService.updatePromptAsset(prompt);
                if (patch.has("coverUrl") || patch.has("previewMediaUrl")) {
                    promptAssetService.syncPrimaryMediaForContentAgent(editId,
                            merged.path("coverUrl").asText(null), merged.path("previewMediaUrl").asText(null));
                }
                break;
            case VIDEO_BACKGROUND:
                VideoBackgroundUpdateRequest video = convert(merged, VideoBackgroundUpdateRequest.class);
                video.setId(editId); video.setStatus(ArtworkStatusEnum.DRAFT.getValue());
                videoBackgroundService.updateVideoBackground(video, operator); break;
            case COMMUNITY_POST:
                CommunityRequests.SavePost community = convert(merged, CommunityRequests.SavePost.class);
                community.setId(id); community.setVersion(current.getResource().path("version").asInt());
                communityPostService.save(community, operator.getId()); break;
            case TUTORIAL_BOOK:
                BlogBookSaveRequest book = convert(merged, BlogBookSaveRequest.class);
                book.setId(id); book.setStatus("disabled");
                blogBookService.saveBook(book, operator); break;
            case TUTORIAL_CHAPTER:
                BlogChapterSaveRequest chapter = convert(merged, BlogChapterSaveRequest.class);
                chapter.setId(id); requireDisabledBook(chapter.getBookId());
                blogBookService.saveChapter(chapter); break;
            case TUTORIAL_POST:
                BlogPostUpdateRequest post = tutorialPost(merged, BlogPostUpdateRequest.class);
                post.setId(editId); post.setVersion(current.getResource().path("version").asInt()); post.setStatus("draft");
                blogPostService.updatePost(post); break;
            default:
                throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return get(type, targetBridge == null ? id : targetBridge.getTargetId(), operator);
    }

    private ContentResourceVO createReplacementDraft(String type, Long targetId, ContentResourceVO current,
            ObjectNode patch, User operator) {
        ObjectNode merged = mergeWritable(type, current.getResource(), patch);
        Long draftId;
        String originalUniqueValue = null;
        switch (type) {
            case ARTWORK:
                ArtworkAddRequest artwork = convert(selectFields(merged, CREATE_WRITABLE.get(type)), ArtworkAddRequest.class);
                artwork.setExternalKey(null);
                artwork.setStatus(ArtworkStatusEnum.DRAFT.getValue());
                artwork.setApiSecret(null);
                draftId = artworkService.addArtwork(artwork, operator);
                break;
            case PROMPT_ASSET:
                ObjectNode promptCreate = selectFields(merged, CREATE_WRITABLE.get(type));
                promptCreate.set("assetType", current.getResource().get("assetType"));
                if (promptCreate.has("tagIdList") && !promptCreate.has("assetTagIdList")) {
                    promptCreate.set("assetTagIdList", promptCreate.get("tagIdList"));
                }
                promptCreate.remove("tagIdList");
                PromptAssetAddRequest prompt = convert(promptCreate, PromptAssetAddRequest.class);
                prompt.setStatus(0); prompt.setApiSecret(null);
                draftId = promptAssetService.addPromptAsset(prompt);
                PromptAssetUpdateRequest promptUpdate = convert(merged, PromptAssetUpdateRequest.class);
                promptUpdate.setId(draftId); promptUpdate.setStatus(0); promptUpdate.setApiSecret(null);
                promptAssetService.updatePromptAsset(promptUpdate);
                promptAssetService.syncPrimaryMediaForContentAgent(draftId,
                        merged.path("coverUrl").asText(null), merged.path("previewMediaUrl").asText(null));
                break;
            case VIDEO_BACKGROUND:
                VideoBackgroundAddRequest video = convert(selectFields(merged, CREATE_WRITABLE.get(type)),
                        VideoBackgroundAddRequest.class);
                video.setStatus(ArtworkStatusEnum.DRAFT.getValue());
                draftId = videoBackgroundService.addVideoBackground(video, operator);
                break;
            case TUTORIAL_POST:
                originalUniqueValue = merged.path("slug").asText();
                ObjectNode postFields = selectFields(merged, CREATE_WRITABLE.get(type));
                postFields.put("slug", "draft-" + targetId + "-" + System.nanoTime());
                BlogPostAddRequest post = tutorialPost(postFields, BlogPostAddRequest.class);
                post.setStatus("draft");
                draftId = blogPostService.addPost(post, operator);
                break;
            default:
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "该资源尚未支持已发布内容的草稿副本");
        }
        draftBridgeService.create(type, targetId, draftId, current.getVersion(), originalUniqueValue, operator.getId());
        return get(type, targetId, operator);
    }

    private ObjectNode selectFields(ObjectNode source, Set<String> fields) {
        ObjectNode result = objectMapper.createObjectNode();
        for (String field : fields) {
            JsonNode value = source.get(field);
            if (value != null) result.set(field, value.deepCopy());
        }
        return result;
    }

    /** Apply a reviewed native draft clone to its stable public id inside the caller's publish transaction. */
    public void applyReplacementDraft(ContentModuleDraftBridge bridge, User operator) {
        String type = bridge.getResourceType();
        Long targetId = bridge.getTargetId();
        ContentResourceVO target = getLive(type, targetId, operator);
        ObjectNode draft = getLive(type, bridge.getDraftId(), operator).getResource().deepCopy();
        ObjectNode draftPatch = editablePatch(type, draft);
        switch (type) {
            case ARTWORK:
                ArtworkUpdateRequest artwork = convert(mergeWritable(type, target.getResource(), draftPatch),
                        ArtworkUpdateRequest.class);
                artwork.setId(targetId);
                artwork.setStatus(ArtworkStatusEnum.PUBLISHED.getValue());
                artwork.setExternalKey(target.getResource().path("externalKey").asText(null));
                artwork.setApiSecret(null);
                artworkService.updateArtwork(artwork, operator);
                artworkService.deleteArtwork(bridge.getDraftId());
                break;
            case PROMPT_ASSET:
                PromptAssetUpdateRequest prompt = convert(mergeWritable(type, target.getResource(), draftPatch),
                        PromptAssetUpdateRequest.class);
                prompt.setId(targetId); prompt.setStatus(1); prompt.setApiSecret(null);
                promptAssetService.updatePromptAsset(prompt);
                promptAssetService.syncPrimaryMediaForContentAgent(targetId,
                        draft.path("coverUrl").asText(null), draft.path("previewMediaUrl").asText(null));
                promptAssetService.deletePromptAsset(bridge.getDraftId());
                break;
            case VIDEO_BACKGROUND:
                VideoBackgroundUpdateRequest video = convert(mergeWritable(type, target.getResource(), draftPatch),
                        VideoBackgroundUpdateRequest.class);
                video.setId(targetId); video.setStatus(ArtworkStatusEnum.PUBLISHED.getValue());
                videoBackgroundService.updateVideoBackground(video, operator);
                videoBackgroundService.deleteVideoBackground(bridge.getDraftId());
                break;
            case TUTORIAL_POST:
                ObjectNode postFields = mergeWritable(type, target.getResource(), draftPatch);
                String draftSlug = postFields.path("slug").asText();
                if (draftSlug.startsWith("draft-" + targetId + "-")
                        && StringUtils.isNotBlank(bridge.getOriginalUniqueValue())) {
                    postFields.put("slug", bridge.getOriginalUniqueValue());
                }
                BlogPostUpdateRequest post = tutorialPost(postFields, BlogPostUpdateRequest.class);
                post.setId(targetId);
                post.setVersion(target.getResource().path("version").asInt());
                post.setStatus("draft");
                blogPostService.updatePost(post);
                blogPostService.deletePost(bridge.getDraftId());
                break;
            default:
                throw new BusinessException(ErrorCode.OPERATION_ERROR, "不支持的草稿替换类型");
        }
    }

    private ObjectNode editablePatch(String type, ObjectNode resource) {
        ObjectNode result = selectFields(resource, UPDATE_WRITABLE.get(type));
        if (ARTWORK.equals(type) || VIDEO_BACKGROUND.equals(type)) {
            copyIds(resource, result, "tagList", "tagIdList");
        } else if (PROMPT_ASSET.equals(type)) {
            copyIds(resource, result, "sceneTagList", "sceneTagIdList");
            copyIds(resource, result, "assetTagList", "assetTagIdList");
        } else if (TUTORIAL_POST.equals(type)) {
            copyIds(resource, result, "tags", "tagIds");
        }
        return result;
    }

    public Map<String, Object> taxonomy() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("siteCategories", categoryService.getCategoryVO(categoryService.list()));
        result.put("siteTags", tagService.getTagVO(tagService.list()));
        result.put("blogCategories", blogCategoryService.listCategories(true));
        result.put("blogTags", blogTagService.listTags(true));
        result.put("communityCategories", communityTaxonomyService.list("category", true));
        result.put("communityTags", communityTaxonomyService.list("tag", true));
        return result;
    }

    private ObjectNode communityDraft(Long id) {
        Map<String, Object> admin = communityPostService.getAdmin(id);
        ObjectNode result = objectMapper.valueToTree(admin.get("draft"));
        result.put("id", id);
        result.set("version", objectMapper.valueToTree(admin.get("version")));
        result.set("status", objectMapper.valueToTree(admin.get("status")));
        result.set("hasUnpublishedChanges", objectMapper.valueToTree(admin.get("hasUnpublishedChanges")));
        return result;
    }

    private ObjectNode chapter(Long id) {
        List<Map<String, Object>> rows = jdbcTemplate.queryForList(
                "SELECT * FROM blog_chapter WHERE id=? AND isDelete=0", id);
        if (rows.isEmpty()) throw notFound();
        return objectMapper.valueToTree(rows.get(0));
    }

    private ArrayNode longArray(String table, String ownerColumn, String valueColumn, Long id) {
        ArrayNode result = objectMapper.createArrayNode();
        for (Long value : jdbcTemplate.queryForList("SELECT " + valueColumn + " FROM " + table
                + " WHERE " + ownerColumn + "=? ORDER BY " + valueColumn, Long.class, id)) result.add(value);
        return result;
    }

    private ObjectNode validateFields(String type, JsonNode fields, boolean creating) {
        requireType(type);
        if (fields == null || !fields.isObject()) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "请求体必须是内容字段对象");
        }
        ObjectNode payload = ((ObjectNode) fields).deepCopy();
        if (payload.isEmpty()) throw new BusinessException(ErrorCode.PARAMS_ERROR, "内容字段不能为空");
        Set<String> allowed = (creating ? CREATE_WRITABLE : UPDATE_WRITABLE).get(type);
        payload.fieldNames().forEachRemaining(name -> {
            if (!allowed.contains(name)) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "字段不允许通过内容密钥设置: " + name);
            }
            if (payload.get(name).isNull()) {
                throw new BusinessException(ErrorCode.PARAMS_ERROR, "字段不能使用 null 清空，请按字段契约传空字符串或空数组: " + name);
            }
        });
        return payload;
    }

    private ObjectNode mergeWritable(String type, JsonNode before, ObjectNode patch) {
        ObjectNode result = objectMapper.createObjectNode();
        for (String field : UPDATE_WRITABLE.get(type)) {
            JsonNode value = before.get(field);
            if (value != null && !value.isNull()) result.set(field, value.deepCopy());
        }
        if (ARTWORK.equals(type) || VIDEO_BACKGROUND.equals(type)) copyIds(before, result, "tagList", "tagIdList");
        if (PROMPT_ASSET.equals(type)) {
            copyIds(before, result, "sceneTagList", "sceneTagIdList");
            copyIds(before, result, "assetTagList", "assetTagIdList");
        }
        if (TUTORIAL_POST.equals(type)) copyIds(before, result, "tags", "tagIds");
        patch.fields().forEachRemaining(entry -> result.set(entry.getKey(), entry.getValue().deepCopy()));
        return result;
    }

    private void copyIds(JsonNode before, ObjectNode target, String sourceField, String targetField) {
        if (target.has(targetField) || !before.path(sourceField).isArray()) return;
        ArrayNode ids = target.putArray(targetField);
        for (JsonNode item : before.path(sourceField)) ids.add(item.isObject() ? item.path("id").asLong() : item.asLong());
    }

    private <T extends BlogPostAddRequest> T tutorialPost(ObjectNode payload, Class<T> type) {
        ObjectNode converted = payload.deepCopy();
        if (converted.has("markdown")) {
            ContentMarkdownService.ConvertedContent content = contentMarkdownService.convert(converted.remove("markdown").asText());
            converted.put("contentJson", content.getContentJson());
            converted.put("contentHtml", content.getContentHtml());
            converted.put("contentSchemaVersion", 1);
        } else if (converted.has("contentJson") && !converted.has("contentHtml")) {
            String source = converted.path("contentJson").isTextual()
                    ? converted.path("contentJson").asText() : converted.path("contentJson").toString();
            ContentMarkdownService.ConvertedContent content = contentMarkdownService.convertTiptap(source);
            converted.put("contentJson", content.getContentJson());
            converted.put("contentHtml", content.getContentHtml());
            converted.put("contentSchemaVersion", 1);
        }
        return convert(converted, type);
    }

    private void requireNativeDraft(String type, JsonNode resource) {
        boolean draft = isNativeDraft(type, resource);
        if (TUTORIAL_CHAPTER.equals(type)) {
            requireDisabledBook(resource.path("bookId").asLong()); return;
        }
        if (!draft) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR,
                    "该内容已经发布，当前接口不会覆盖线上版本；请等待该模块的双版本草稿支持");
        }
    }

    private boolean isNativeDraft(String type, JsonNode resource) {
        if (ARTWORK.equals(type) || PROMPT_ASSET.equals(type) || VIDEO_BACKGROUND.equals(type)) {
            return resource.path("status").asInt(-1) == ArtworkStatusEnum.DRAFT.getValue();
        } else if (TUTORIAL_POST.equals(type)) {
            return "draft".equals(resource.path("status").asText());
        } else if (TUTORIAL_BOOK.equals(type)) {
            return "disabled".equals(resource.path("status").asText());
        } else if (TUTORIAL_CHAPTER.equals(type)) {
            BlogBook book = blogBookService.getById(resource.path("bookId").asLong());
            return book != null && "disabled".equals(book.getStatus());
        }
        return false;
    }

    private void requireDisabledBook(Long bookId) {
        BlogBook book = bookId == null ? null : blogBookService.getById(bookId);
        if (book == null) throw new BusinessException(ErrorCode.PARAMS_ERROR, "教程书不存在");
        if (!"disabled".equals(book.getStatus())) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "已启用教程书的目录暂不允许通过密钥直接修改");
        }
    }

    private void verifyVersion(String supplied, String current) {
        String normalized = StringUtils.trimToNull(supplied);
        if (normalized != null && normalized.length() > 1 && normalized.startsWith("\"") && normalized.endsWith("\"")) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }
        if (normalized == null) throw new BusinessException(ErrorCode.PARAMS_ERROR, "更新必须携带 If-Match 版本");
        if (!StringUtils.equals(normalized, current)) {
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "内容已发生变化，请重新查询后再更新");
        }
    }

    private ContentResourceVO view(String type, Long id, JsonNode resource) {
        ContentResourceVO result = new ContentResourceVO();
        result.setResourceType(type); result.setId(String.valueOf(id));
        result.setResource(resource); result.setVersion(hash(versionSource(type, resource)));
        return result;
    }

    private JsonNode versionSource(String type, JsonNode resource) {
        ObjectNode result = objectMapper.createObjectNode();
        for (String field : UPDATE_WRITABLE.get(type)) {
            JsonNode value = resource.get(field);
            if (value != null) result.set(field, value);
        }
        if (ARTWORK.equals(type) || VIDEO_BACKGROUND.equals(type)) {
            copyIds(resource, result, "tagList", "tagIdList");
        } else if (PROMPT_ASSET.equals(type)) {
            copyIds(resource, result, "sceneTagList", "sceneTagIdList");
            copyIds(resource, result, "assetTagList", "assetTagIdList");
        } else if (TUTORIAL_POST.equals(type)) {
            copyIds(resource, result, "tags", "tagIds");
        }
        // Dynamic counters can touch updateTime in some tables. Editable fields and the
        // module's own version/status are sufficient to detect meaningful conflicts.
        for (String field : Arrays.asList("status", "version")) {
            JsonNode value = resource.get(field);
            if (value != null) result.set(field, value);
        }
        return result;
    }

    private String hash(JsonNode value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(objectMapper.writeValueAsString(value).getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder();
            for (byte item : digest) result.append(String.format("%02x", item));
            return result.toString();
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.SYSTEM_ERROR, "内容版本生成失败");
        }
    }

    private ContentResourceQuery normalizeQuery(ContentResourceQuery query) {
        ContentResourceQuery result = query == null ? new ContentResourceQuery() : query;
        if (result.getCurrent() < 1) result.setCurrent(1);
        if (result.getPageSize() < 1 || result.getPageSize() > 50) result.setPageSize(20);
        return result;
    }

    private void copyPage(ContentResourceQuery source, com.yupi.springbootinit.common.PageRequest target) {
        target.setCurrent(source.getCurrent()); target.setPageSize(source.getPageSize());
        target.setSortField(source.getSortField()); target.setSortOrder(source.getSortOrder());
    }

    private Integer integerStatus(String status) {
        if (StringUtils.isBlank(status)) return null;
        if (!"0".equals(status) && !"1".equals(status) && !"2".equals(status)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "status 必须是 0、1 或 2");
        }
        return Integer.valueOf(status);
    }

    private <T> T convert(JsonNode value, Class<T> type) {
        try {
            return objectMapper.treeToValue(value, type);
        } catch (Exception e) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "内容字段类型不正确: " + e.getMessage());
        }
    }

    private Map<String, Object> page(List<?> records, long total, long current, long size) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("records", records); result.put("total", total);
        result.put("current", current); result.put("size", size);
        return result;
    }

    private Set<String> splitScopes(String scopes) {
        if (StringUtils.isBlank(scopes)) return Collections.emptySet();
        return new LinkedHashSet<>(Arrays.asList(StringUtils.split(scopes, ',')));
    }

    private void requireType(String type) {
        if (!TYPES.contains(type)) throw new BusinessException(ErrorCode.PARAMS_ERROR, "未知内容类型: " + type);
    }

    private BusinessException notFound() {
        return new BusinessException(ErrorCode.NOT_FOUND_ERROR, "内容不存在");
    }

    private Long number(Object value) {
        if (!(value instanceof Number)) throw new BusinessException(ErrorCode.SYSTEM_ERROR, "内容保存结果无效");
        return ((Number) value).longValue();
    }

    private String draftLabel(String type) {
        if (TUTORIAL_BOOK.equals(type) || TUTORIAL_CHAPTER.equals(type)) return "disabled tutorial workspace";
        return "draft";
    }

    private static Map<String, Set<String>> writableFields(boolean creating) {
        Map<String, Set<String>> result = new LinkedHashMap<>();
        result.put(ARTWORK, set("externalKey", "title", "summary", "description", "coverUrl", "videoUrl",
                "promptContent", "categoryId", "cashPrice", "pointsPrice", "memberOnly", "sort", "htmlUrl",
                "sourceZipUrl", "tagIdList"));
        result.put(PROMPT_ASSET, creating
                ? set("assetType", "categoryId", "title", "summary", "promptContent", "promptCn",
                "coverUrl", "previewMediaUrl", "memberOnly", "sort", "isFeatured", "featuredSort",
                "sceneTagIdList", "assetTagIdList", "tagIdList")
                : set("categoryId", "title", "summary", "promptContent", "promptCn", "coverUrl",
                "previewMediaUrl", "memberOnly", "sort", "isFeatured", "featuredSort", "sceneTagIdList",
                "assetTagIdList", "tagIdList", "visualAssetType", "scenario", "visualStyle", "qualityLevel",
                "selectionStatus", "license", "commercialRisk"));
        result.put(VIDEO_BACKGROUND, set("title", "summary", "promptContent", "coverUrl", "previewVideoUrl",
                "sourceVideoUrl", "categoryId", "memberOnly", "videoWidth", "videoHeight", "durationMs",
                "fileSize", "videoFormat", "sort", "tagIdList"));
        result.put(COMMUNITY_POST, set("title", "summary", "categoryId", "tagIds", "markdown", "commentsEnabled"));
        result.put(TUTORIAL_BOOK, set("categoryId", "title", "slug", "summary", "introductionHtml", "coverUrl",
                "seoTitle", "seoDescription", "memberOnly", "sort"));
        result.put(TUTORIAL_CHAPTER, set("bookId", "title", "description", "sort"));
        result.put(TUTORIAL_POST, set("categoryId", "chapterId", "tagIds", "title", "slug", "summary",
                "coverUrl", "markdown", "contentJson", "visibility", "memberOnly", "seoTitle", "seoDescription"));
        return Collections.unmodifiableMap(result);
    }

    private static Set<String> set(String... fields) {
        return Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(fields)));
    }
}
