package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.*;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.model.dto.community.CommunityRequests.*;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.service.community.*;
import java.util.*;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/community")
public class CommunityController {
    private final CommunityPostService posts;
    private final CommunityTaxonomyService taxonomy;
    private final CommunityInteractionService interactions;
    private final UserService users;
    public CommunityController(CommunityPostService posts,CommunityTaxonomyService taxonomy,CommunityInteractionService interactions,UserService users) {
        this.posts=posts;this.taxonomy=taxonomy;this.interactions=interactions;this.users=users;
    }
    @PostMapping("/post/list/page")
    public BaseResponse<Map<String,Object>> list(@RequestBody Query q,HttpServletRequest request) {
        User user=users.getLoginUserPermitNull(request);
        return ResultUtils.success(posts.list(q,false,user==null?null:user.getId()));
    }
    @GetMapping("/post/get")
    public BaseResponse<Map<String,Object>> get(@RequestParam Long id,HttpServletRequest request) {
        User user=users.getLoginUserPermitNull(request);
        return ResultUtils.success(posts.getPublic(id,user==null?null:user.getId()));
    }
    @GetMapping("/taxonomy/{kind}")
    public BaseResponse<List<Map<String,Object>>> taxonomy(@PathVariable String kind) { return ResultUtils.success(taxonomy.list(kind,false)); }
    @PostMapping("/comment/list/page")
    public BaseResponse<Map<String,Object>> comments(@RequestBody Query q) { return ResultUtils.success(interactions.comments(q,false)); }
    @GetMapping("/comment/context")
    public BaseResponse<Map<String,Object>> commentContext(@RequestParam Long postId,@RequestParam Long id) {
        return ResultUtils.success(interactions.commentContext(postId,id));
    }
    @PostMapping("/comment/add")
    public BaseResponse<String> comment(@RequestBody Comment r,HttpServletRequest request) {
        User user=actor(request);
        return ResultUtils.success(interactions.comment(r,user.getId(),UserConstant.ADMIN_ROLE.equals(user.getUserRole())));
    }
    @PostMapping("/like")
    public BaseResponse<Map<String,Object>> like(@RequestBody Like r,HttpServletRequest request) { return ResultUtils.success(interactions.like(r,actor(request).getId())); }
    @PostMapping("/report")
    public BaseResponse<String> report(@RequestBody Report r,HttpServletRequest request) { return ResultUtils.success(interactions.report(r,actor(request).getId())); }
    @PostMapping("/me/comments/list/page")
    public BaseResponse<Map<String,Object>> myComments(@RequestBody Query q,HttpServletRequest request) {
        return ResultUtils.success(interactions.myComments(q,actor(request).getId()));
    }
    @PostMapping("/me/likes/list/page")
    public BaseResponse<Map<String,Object>> myLikes(@RequestBody Query q,HttpServletRequest request) {
        return ResultUtils.success(interactions.myLikes(q,actor(request).getId()));
    }

    private User actor(HttpServletRequest request) {
        User user=users.getLoginUser(request);
        if (!"user".equals(user.getUserRole()) && !UserConstant.ADMIN_ROLE.equals(user.getUserRole()))
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "该账号不能进行互动");
        return user;
    }

    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/post/list/page")
    public BaseResponse<Map<String,Object>> adminList(@RequestBody Query q) { return ResultUtils.success(posts.list(q,true)); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @GetMapping("/admin/post/get")
    public BaseResponse<Map<String,Object>> adminGet(@RequestParam Long id) { return ResultUtils.success(posts.getAdmin(id)); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/post/save")
    @OperationLog(module="community",action="save_post_draft")
    public BaseResponse<Map<String,Object>> save(@RequestBody SavePost r,HttpServletRequest request) { return ResultUtils.success(posts.save(r,users.getLoginUser(request).getId())); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/post/{action:publish|offline|delete}")
    @OperationLog(module="community",action="change_post_status")
    public BaseResponse<Boolean> action(@PathVariable String action,@RequestBody PostAction r) { posts.action(r,action); return ResultUtils.success(true); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/post/{action:pin|unpin}")
    @OperationLog(module="community",action="change_post_pin")
    public BaseResponse<Map<String,Object>> pin(@PathVariable String action,@RequestBody PostAction r) {
        return ResultUtils.success(posts.pin(r,"pin".equals(action)));
    }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/post/announcement")
    @OperationLog(module="community",action="generate_announcement_draft")
    public BaseResponse<String> announcement(@RequestBody PostAction r,HttpServletRequest request) { return ResultUtils.success(posts.announcement(r,users.getLoginUser(request))); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @GetMapping("/admin/taxonomy/{kind}")
    public BaseResponse<List<Map<String,Object>>> adminTaxonomy(@PathVariable String kind) { return ResultUtils.success(taxonomy.list(kind,true)); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/taxonomy/{kind}/save")
    @OperationLog(module="community",action="save_taxonomy")
    public BaseResponse<Long> saveTaxonomy(@PathVariable String kind,@RequestBody Taxonomy r) { return ResultUtils.success(taxonomy.save(kind,r)); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/taxonomy/{kind}/delete")
    @OperationLog(module="community",action="delete_taxonomy")
    public BaseResponse<Boolean> deleteTaxonomy(@PathVariable String kind,@RequestBody PostAction r) { taxonomy.delete(kind,r.getId());return ResultUtils.success(true); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/comment/list/page")
    public BaseResponse<Map<String,Object>> adminComments(@RequestBody Query q) { return ResultUtils.success(interactions.comments(q,true)); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/comment/moderate")
    @OperationLog(module="community",action="moderate_comment")
    public BaseResponse<Boolean> moderate(@RequestBody Moderate r) { interactions.moderate(r);return ResultUtils.success(true); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/report/list/page")
    public BaseResponse<Map<String,Object>> reports(@RequestBody Query q) { return ResultUtils.success(interactions.reports(q)); }
    @AuthCheck(mustRole=UserConstant.ADMIN_ROLE) @PostMapping("/admin/report/resolve")
    @OperationLog(module="community",action="resolve_report")
    public BaseResponse<Boolean> resolve(@RequestBody ResolveReport r,HttpServletRequest request) { interactions.resolve(r,users.getLoginUser(request).getId()); return ResultUtils.success(true); }
}
