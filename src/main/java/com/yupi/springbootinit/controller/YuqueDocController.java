package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.annotation.AuthCheck;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.DeleteRequest;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.yuque.YuqueBookSaveRequest;
import com.yupi.springbootinit.model.dto.yuque.YuqueDocUpdateRequest;
import com.yupi.springbootinit.model.dto.yuque.YuqueSyncRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.yuque.YuqueBookVO;
import com.yupi.springbootinit.model.vo.yuque.YuqueDocVO;
import com.yupi.springbootinit.model.vo.yuque.YuqueTocVO;
import com.yupi.springbootinit.service.UserService;
import com.yupi.springbootinit.service.YuqueBookService;
import com.yupi.springbootinit.service.YuqueDocService;
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
@RequestMapping("/docs")
@Api(tags = "Yuque Docs")
public class YuqueDocController {

    @Resource
    private UserService userService;

    @Resource
    private YuqueBookService yuqueBookService;

    @Resource
    private YuqueDocService yuqueDocService;

    @GetMapping("/books")
    @ApiOperation("List visible doc books")
    public BaseResponse<List<YuqueBookVO>> listBooks(HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(yuqueBookService.listVisibleBooks(loginUser));
    }

    @GetMapping("/books/{bookSlug}/toc")
    @ApiOperation("List visible doc table of contents")
    public BaseResponse<List<YuqueTocVO>> listToc(@PathVariable String bookSlug, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(yuqueDocService.listToc(bookSlug, loginUser));
    }

    @GetMapping("/search")
    @ApiOperation("Search visible docs")
    public BaseResponse<List<YuqueDocVO>> searchDocs(@RequestParam String keyword, HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(yuqueDocService.searchDocs(keyword, loginUser));
    }

    @GetMapping("/{bookSlug}/{docSlug}")
    @ApiOperation("Get visible doc detail")
    public BaseResponse<YuqueDocVO> getDoc(@PathVariable String bookSlug, @PathVariable String docSlug,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(yuqueDocService.getDoc(bookSlug, docSlug, loginUser));
    }

    @PostMapping("/admin/books")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin create or update doc book")
    public BaseResponse<Long> saveBook(@RequestBody YuqueBookSaveRequest request) {
        return ResultUtils.success(yuqueBookService.saveBook(request));
    }

    @PostMapping("/admin/books/delete")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin delete doc book")
    public BaseResponse<Boolean> deleteBook(@RequestBody DeleteRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(yuqueBookService.deleteBook(request.getId()));
    }

    @PostMapping("/admin/sync")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin sync one Yuque book")
    public BaseResponse<Boolean> syncBook(@RequestBody YuqueSyncRequest request) {
        if (request == null || request.getBookId() == null || request.getBookId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        return ResultUtils.success(yuqueBookService.syncBook(request.getBookId()));
    }

    @PostMapping("/admin/sync/all")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin sync all online Yuque books")
    public BaseResponse<Boolean> syncAllBooks() {
        return ResultUtils.success(yuqueBookService.syncAllEnabledBooks());
    }

    @PostMapping("/admin/docs/update")
    @AuthCheck(mustRole = UserConstant.ADMIN_ROLE)
    @ApiOperation("Admin update cached doc metadata")
    public BaseResponse<Boolean> updateDoc(@RequestBody YuqueDocUpdateRequest request) {
        return ResultUtils.success(yuqueDocService.updateDoc(request));
    }
}
