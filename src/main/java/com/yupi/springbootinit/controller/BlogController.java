package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.DeleteRequest;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.blog.BlogCategorySaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogBookFavoriteRequest;
import com.yupi.springbootinit.model.dto.blog.BlogFrontBookQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogFrontPostQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogBookQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogBookSaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogChapterSaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogOutlineReorderRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostAssignRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostAddRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostBatchRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostFavoriteRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostReadTrackRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostUpdateRequest;
import com.yupi.springbootinit.model.dto.blog.BlogTagSaveRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.blog.BlogCategoryVO;
import com.yupi.springbootinit.model.vo.blog.BlogBookVO;
import com.yupi.springbootinit.model.vo.blog.BlogChapterVO;
import com.yupi.springbootinit.model.vo.blog.BlogPostVO;
import com.yupi.springbootinit.model.vo.blog.BlogTagVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookDetailVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookListVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontFiltersVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontOverviewVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostDetailVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostOutlineVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogPostReadResultVO;
import com.yupi.springbootinit.manager.PublicContentAntiCrawlerManager;
import com.yupi.springbootinit.service.BlogCategoryService;
import com.yupi.springbootinit.service.BlogFrontService;
import com.yupi.springbootinit.service.BlogBookService;
import com.yupi.springbootinit.service.BlogPostService;
import com.yupi.springbootinit.service.BlogTagService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.List;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/blog")
@Api(tags = "Blog")
public class BlogController {

    @Resource
    private BlogPostService blogPostService;

    @Resource
    private BlogBookService blogBookService;

    @Resource
    private BlogCategoryService blogCategoryService;

    @Resource
    private BlogTagService blogTagService;

    @Resource
    private BlogFrontService blogFrontService;

    @Resource
    private PublicContentAntiCrawlerManager publicContentAntiCrawlerManager;

    @Resource
    private UserService userService;

    @GetMapping("/front/overview")
    @ApiOperation("Get frontend tutorial overview")
    public BaseResponse<BlogFrontOverviewVO> getFrontOverview(HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(blogFrontService.getOverview(loginUser));
    }

    @PostMapping("/front/books/page")
    @ApiOperation("Page query tutorial books for frontend")
    public BaseResponse<Page<BlogFrontBookListVO>> listFrontBooks(
            @RequestBody(required = false) BlogFrontBookQueryRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUserPermitNull(httpRequest);
        publicContentAntiCrawlerManager.checkRequest(request, loginUser, httpRequest);
        return ResultUtils.success(blogFrontService.listBooks(request, loginUser));
    }

    @GetMapping("/front/books/{bookId}")
    @ApiOperation("Get frontend tutorial book outline by id")
    public BaseResponse<BlogFrontBookDetailVO> getFrontBook(
            @PathVariable Long bookId, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(blogFrontService.getBook(bookId, loginUser));
    }

    @PostMapping("/front/posts/page")
    @ApiOperation("Page query independent articles for frontend")
    public BaseResponse<Page<BlogFrontPostOutlineVO>> listFrontPosts(
            @RequestBody(required = false) BlogFrontPostQueryRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUserPermitNull(httpRequest);
        publicContentAntiCrawlerManager.checkRequest(request, loginUser, httpRequest);
        return ResultUtils.success(blogFrontService.listPosts(request, loginUser));
    }

    @GetMapping("/front/posts/{postId}")
    @ApiOperation("Get frontend published article by id with access validation")
    public BaseResponse<BlogFrontPostDetailVO> getFrontPost(
            @PathVariable Long postId, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(blogFrontService.getPost(postId, loginUser));
    }

    @PostMapping("/front/posts/read")
    @ApiOperation("Track an effective tutorial article read after the dwell-time threshold")
    public BaseResponse<BlogPostReadResultVO> trackFrontPostRead(
            @RequestBody BlogPostReadTrackRequest trackRequest, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(blogFrontService.trackPostRead(trackRequest, loginUser));
    }

    @GetMapping("/front/filters")
    @ApiOperation("Get frontend tutorial category and tag filters")
    public BaseResponse<BlogFrontFiltersVO> getFrontFilters(HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(blogFrontService.getFilters(loginUser));
    }

    @PostMapping("/front/books/favorite/add")
    @OperationLog(module = "blog", action = "favorite_book")
    @ApiOperation("Favorite a tutorial book")
    public BaseResponse<Boolean> addFrontBookFavorite(
            @RequestBody BlogBookFavoriteRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogFrontService.addBookFavorite(requireBookId(request), loginUser));
    }

    @PostMapping("/front/books/favorite/cancel")
    @OperationLog(module = "blog", action = "cancel_favorite_book")
    @ApiOperation("Cancel a tutorial book favorite")
    public BaseResponse<Boolean> cancelFrontBookFavorite(
            @RequestBody BlogBookFavoriteRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogFrontService.cancelBookFavorite(requireBookId(request), loginUser));
    }

    @GetMapping("/front/books/favorite/check")
    @ApiOperation("Check current user's tutorial book favorite status")
    public BaseResponse<Boolean> checkFrontBookFavorite(
            @RequestParam Long bookId, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogFrontService.isBookFavorited(bookId, loginUser));
    }

    @PostMapping("/front/books/favorite/my/page")
    @ApiOperation("Page query current user's favorite tutorial books")
    public BaseResponse<Page<BlogFrontBookListVO>> listMyFrontBookFavorites(
            @RequestBody(required = false) BlogFrontBookQueryRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        publicContentAntiCrawlerManager.checkRequest(request, loginUser, httpRequest);
        return ResultUtils.success(blogFrontService.listMyFavoriteBooks(request, loginUser));
    }

    @PostMapping("/front/posts/favorite/add")
    @OperationLog(module = "blog", action = "favorite_post")
    @ApiOperation("Favorite a tutorial post")
    public BaseResponse<Boolean> addFrontPostFavorite(
            @RequestBody BlogPostFavoriteRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogFrontService.addPostFavorite(requirePostId(request), loginUser));
    }

    @PostMapping("/front/posts/favorite/cancel")
    @OperationLog(module = "blog", action = "cancel_favorite_post")
    @ApiOperation("Cancel a tutorial post favorite")
    public BaseResponse<Boolean> cancelFrontPostFavorite(
            @RequestBody BlogPostFavoriteRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogFrontService.cancelPostFavorite(requirePostId(request), loginUser));
    }

    @GetMapping("/front/posts/favorite/check")
    @ApiOperation("Check current user's tutorial post favorite status")
    public BaseResponse<Boolean> checkFrontPostFavorite(
            @RequestParam Long postId, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogFrontService.isPostFavorited(postId, loginUser));
    }

    @PostMapping("/front/posts/favorite/my/page")
    @ApiOperation("Page query current user's favorite tutorial posts")
    public BaseResponse<Page<BlogFrontPostOutlineVO>> listMyFrontPostFavorites(
            @RequestBody(required = false) BlogFrontPostQueryRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUser(httpRequest);
        publicContentAntiCrawlerManager.checkRequest(request, loginUser, httpRequest);
        return ResultUtils.success(blogFrontService.listMyFavoritePosts(request, loginUser));
    }

    @PostMapping("/posts")
    @ApiOperation("Page query published blog posts")
    public BaseResponse<Page<BlogPostVO>> listPublishedPosts(
            @RequestBody(required = false) BlogPostQueryRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUserPermitNull(httpRequest);
        return ResultUtils.success(blogPostService.listPublishedPosts(request, loginUser));
    }

    @GetMapping("/posts/{slug}")
    @ApiOperation("Get published blog post by slug")
    public BaseResponse<BlogPostVO> getPublishedPost(@PathVariable String slug, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(blogPostService.getPublishedPost(slug, loginUser));
    }

    @PostMapping("/books")
    @ApiOperation("Page query published tutorial books")
    public BaseResponse<Page<BlogBookVO>> listPublishedBooks(
            @RequestBody(required = false) BlogBookQueryRequest request, HttpServletRequest httpRequest) {
        User loginUser = userService.getLoginUserPermitNull(httpRequest);
        return ResultUtils.success(blogBookService.listPublishedBooks(request, loginUser));
    }

    @GetMapping("/books/{slug}")
    @ApiOperation("Get published tutorial book outline by slug")
    public BaseResponse<BlogBookVO> getPublishedBook(@PathVariable String slug, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(blogBookService.getPublishedBook(slug, loginUser));
    }

    @GetMapping("/categories")
    @ApiOperation("List enabled blog categories")
    public BaseResponse<List<BlogCategoryVO>> listCategories() {
        return ResultUtils.success(blogCategoryService.listCategories(false));
    }

    @GetMapping("/tags")
    @ApiOperation("List enabled blog tags")
    public BaseResponse<List<BlogTagVO>> listTags() {
        return ResultUtils.success(blogTagService.listTags(false));
    }

    @PostMapping("/admin/posts/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query blog posts")
    public BaseResponse<Page<BlogPostVO>> listAdminPosts(
            @RequestBody(required = false) BlogPostQueryRequest request) {
        return ResultUtils.success(blogPostService.listAdminPosts(request));
    }

    @GetMapping("/admin/posts/get")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin get blog post detail")
    public BaseResponse<BlogPostVO> getAdminPost(@RequestParam Long id) {
        return ResultUtils.success(blogPostService.getAdminPost(id));
    }

    @PostMapping("/admin/posts/add")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "add_post")
    @ApiOperation("Admin add blog post draft")
    public BaseResponse<Long> addPost(@RequestBody BlogPostAddRequest request, HttpServletRequest httpRequest) {
        User adminUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogPostService.addPost(request, adminUser));
    }

    @PostMapping("/admin/posts/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "update_post")
    @ApiOperation("Admin update blog post")
    public BaseResponse<Boolean> updatePost(@RequestBody BlogPostUpdateRequest request) {
        return ResultUtils.success(blogPostService.updatePost(request));
    }

    @PostMapping("/admin/posts/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "delete_post")
    @ApiOperation("Admin delete blog post")
    public BaseResponse<Boolean> deletePost(@RequestBody DeleteRequest request) {
        return ResultUtils.success(blogPostService.deletePost(requireId(request)));
    }

    @PostMapping("/admin/posts/publish")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "publish_post")
    @ApiOperation("Admin publish blog post")
    public BaseResponse<Boolean> publishPost(@RequestBody DeleteRequest request, HttpServletRequest httpRequest) {
        User adminUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogPostService.publishPost(requireId(request), adminUser));
    }

    @PostMapping("/admin/posts/batch/publish")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "batch_publish_posts")
    @ApiOperation("Admin batch publish blog posts")
    public BaseResponse<Integer> batchPublishPosts(
            @RequestBody BlogPostBatchRequest request, HttpServletRequest httpRequest) {
        User adminUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogPostService.batchPublishPosts(
                request == null ? null : request.getIds(), adminUser));
    }

    @PostMapping("/admin/posts/batch/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "batch_delete_posts")
    @ApiOperation("Admin batch delete blog posts")
    public BaseResponse<Integer> batchDeletePosts(@RequestBody BlogPostBatchRequest request) {
        return ResultUtils.success(blogPostService.batchDeletePosts(request == null ? null : request.getIds()));
    }

    @PostMapping("/admin/posts/batch/member-only")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "batch_set_post_member_only")
    @ApiOperation("Admin batch set blog post member access")
    public BaseResponse<Integer> batchSetPostMemberOnly(@RequestBody BlogPostBatchRequest request) {
        return ResultUtils.success(blogPostService.batchSetMemberOnly(
                request == null ? null : request.getIds(), request == null ? null : request.getMemberOnly()));
    }

    @PostMapping("/admin/posts/offline")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "offline_post")
    @ApiOperation("Admin offline blog post")
    public BaseResponse<Boolean> offlinePost(@RequestBody DeleteRequest request) {
        return ResultUtils.success(blogPostService.offlinePost(requireId(request)));
    }

    @PostMapping("/admin/books/list/page")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin page query tutorial books")
    public BaseResponse<Page<BlogBookVO>> listAdminBooks(
            @RequestBody(required = false) BlogBookQueryRequest request) {
        return ResultUtils.success(blogBookService.listAdminBooks(request));
    }

    @GetMapping("/admin/books/get")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin get tutorial book and outline")
    public BaseResponse<BlogBookVO> getAdminBook(@RequestParam Long id) {
        return ResultUtils.success(blogBookService.getAdminBook(id));
    }

    @PostMapping("/admin/books/save")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "save_book")
    @ApiOperation("Admin create or update tutorial book")
    public BaseResponse<Long> saveBook(@RequestBody BlogBookSaveRequest request, HttpServletRequest httpRequest) {
        User adminUser = userService.getLoginUser(httpRequest);
        return ResultUtils.success(blogBookService.saveBook(request, adminUser));
    }

    @PostMapping("/admin/books/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "delete_book")
    @ApiOperation("Admin delete empty tutorial book")
    public BaseResponse<Boolean> deleteBook(@RequestBody DeleteRequest request) {
        return ResultUtils.success(blogBookService.deleteBook(requireId(request)));
    }

    @PostMapping("/admin/chapters/save")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "save_chapter")
    @ApiOperation("Admin create or update tutorial chapter")
    public BaseResponse<Long> saveChapter(@RequestBody BlogChapterSaveRequest request) {
        return ResultUtils.success(blogBookService.saveChapter(request));
    }

    @GetMapping("/admin/chapters")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin list tutorial chapters")
    public BaseResponse<List<BlogChapterVO>> listAdminChapters(
            @RequestParam(required = false) Long bookId) {
        return ResultUtils.success(blogBookService.listChapters(bookId));
    }

    @PostMapping("/admin/chapters/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "delete_chapter")
    @ApiOperation("Admin delete empty tutorial chapter")
    public BaseResponse<Boolean> deleteChapter(@RequestBody DeleteRequest request) {
        return ResultUtils.success(blogBookService.deleteChapter(requireId(request)));
    }

    @PostMapping("/admin/books/outline/reorder")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "reorder_outline")
    @ApiOperation("Admin reorder tutorial chapters and posts")
    public BaseResponse<Boolean> reorderOutline(@RequestBody BlogOutlineReorderRequest request) {
        return ResultUtils.success(blogBookService.reorderOutline(request));
    }

    @PostMapping("/admin/posts/assign")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "assign_post")
    @ApiOperation("Admin assign or detach a post from a tutorial chapter")
    public BaseResponse<Boolean> assignPost(@RequestBody BlogPostAssignRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(blogBookService.assignPost(request.getPostId(), request.getChapterId()));
    }

    @GetMapping("/admin/categories")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin list blog categories")
    public BaseResponse<List<BlogCategoryVO>> listAdminCategories() {
        return ResultUtils.success(blogCategoryService.listCategories(true));
    }

    @PostMapping("/admin/categories/save")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "save_category")
    @ApiOperation("Admin create or update blog category")
    public BaseResponse<Long> saveCategory(@RequestBody BlogCategorySaveRequest request) {
        return ResultUtils.success(blogCategoryService.saveCategory(request));
    }

    @PostMapping("/admin/categories/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "delete_category")
    @ApiOperation("Admin delete blog category")
    public BaseResponse<Boolean> deleteCategory(@RequestBody DeleteRequest request) {
        return ResultUtils.success(blogCategoryService.deleteCategory(requireId(request)));
    }

    @GetMapping("/admin/tags")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin list blog tags")
    public BaseResponse<List<BlogTagVO>> listAdminTags() {
        return ResultUtils.success(blogTagService.listTags(true));
    }

    @PostMapping("/admin/tags/save")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "save_tag")
    @ApiOperation("Admin create or update blog tag")
    public BaseResponse<Long> saveTag(@RequestBody BlogTagSaveRequest request) {
        return ResultUtils.success(blogTagService.saveTag(request));
    }

    @PostMapping("/admin/tags/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @OperationLog(module = "blog", action = "delete_tag")
    @ApiOperation("Admin delete blog tag")
    public BaseResponse<Boolean> deleteTag(@RequestBody DeleteRequest request) {
        return ResultUtils.success(blogTagService.deleteTag(requireId(request)));
    }

    private Long requireId(DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return request.getId();
    }

    private Long requireBookId(BlogBookFavoriteRequest request) {
        Long id = request == null || request.getBookId() == null ? request == null ? null : request.getId()
                : request.getBookId();
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return id;
    }

    private Long requirePostId(BlogPostFavoriteRequest request) {
        Long id = request == null || request.getPostId() == null ? request == null ? null : request.getId()
                : request.getPostId();
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return id;
    }
}
