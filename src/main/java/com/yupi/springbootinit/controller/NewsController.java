package com.yupi.springbootinit.controller;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.common.BaseResponse;
import com.yupi.springbootinit.common.ResultUtils;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementQueryRequest;
import com.yupi.springbootinit.model.dto.announcement.NewsPopupRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.announcement.PublicNewsVO;
import com.yupi.springbootinit.service.NewsService;
import com.yupi.springbootinit.service.UserService;
import javax.annotation.Resource;
import javax.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/news")
public class NewsController {
    @Resource
    private NewsService newsService;
    @Resource
    private UserService userService;

    @PostMapping("/list/page")
    public BaseResponse<Page<PublicNewsVO>> list(@RequestBody(required = false) AnnouncementQueryRequest query) {
        return ResultUtils.success(newsService.list(query));
    }

    @GetMapping("/get")
    public BaseResponse<PublicNewsVO> get(@RequestParam Long id) {
        return ResultUtils.success(newsService.get(id));
    }

    @PostMapping("/popup/candidate")
    public BaseResponse<PublicNewsVO> popup(@RequestBody(required = false) NewsPopupRequest body,
            HttpServletRequest request) {
        User user = userService.getLoginUserPermitNull(request);
        return ResultUtils.success(newsService.popup(body == null ? null : body.getIds(),
                user == null ? null : user.getId()));
    }

    @PostMapping("/popup/dismiss")
    public BaseResponse<Boolean> dismiss(@RequestBody NewsPopupRequest body, HttpServletRequest request) {
        User user = userService.getLoginUser(request);
        newsService.dismiss(body == null ? null : body.getIds(), user.getId());
        return ResultUtils.success(true);
    }
}
