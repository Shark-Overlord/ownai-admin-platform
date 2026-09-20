package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.annotation.OperationLog;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteAddRequest;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteCancelRequest;
import com.yupi.springbootinit.model.dto.artwork.DeconstructionAssetFavoriteQueryRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.artwork.DeconstructionAssetFavoriteVO;
import com.yupi.springbootinit.service.DeconstructionAssetFavoriteService;
import com.yupi.springbootinit.service.UserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import java.util.List;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 作品解构资产细粒度收藏接口
 */
@RestController
@RequestMapping("/artwork/deconstruction/favorite")
@Api(tags = "作品解构资产细粒度收藏接口")
public class DeconstructionAssetFavoriteController {

    @Resource
    private DeconstructionAssetFavoriteService favoriteService;

    @Resource
    private UserService userService;

    @PostMapping("/add")
    @OperationLog(module = "artwork_deconstruction", action = "favorite_asset")
    @ApiOperation("收藏解构资产(提示词/零件切片代码/图标)")
    public BaseResponse<Boolean> addFavorite(
            @RequestBody DeconstructionAssetFavoriteAddRequest addRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(favoriteService.addFavorite(addRequest, loginUser));
    }

    @PostMapping("/cancel")
    @OperationLog(module = "artwork_deconstruction", action = "cancel_favorite_asset")
    @ApiOperation("取消收藏解构资产")
    public BaseResponse<Boolean> cancelFavorite(
            @RequestBody DeconstructionAssetFavoriteCancelRequest cancelRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(favoriteService.cancelFavorite(cancelRequest, loginUser));
    }

    @GetMapping("/keys")
    @ApiOperation("查询作品下已收藏的资产键列表")
    public BaseResponse<List<String>> listFavoritedKeys(
            @RequestParam("artworkId") Long artworkId,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(favoriteService.listFavoritedKeys(artworkId, loginUser));
    }

    @PostMapping("/my/page")
    @ApiOperation("分页查询当前用户的解构资产收藏")
    public BaseResponse<Page<DeconstructionAssetFavoriteVO>> listMyFavoritesByPage(
            @RequestBody DeconstructionAssetFavoriteQueryRequest queryRequest,
            HttpServletRequest request) {
        User loginUser = userService.getLoginUser(request);
        return ResultUtils.success(favoriteService.listMyFavoritesByPage(queryRequest, loginUser));
    }
}