package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.constant.YuqueDocConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.YuqueDocMapper;
import com.yupi.springbootinit.model.dto.yuque.YuqueDocUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.YuqueBook;
import com.yupi.springbootinit.model.entity.YuqueDoc;
import com.yupi.springbootinit.model.entity.YuqueToc;
import com.yupi.springbootinit.model.vo.yuque.YuqueDocVO;
import com.yupi.springbootinit.model.vo.yuque.YuqueTocVO;
import com.yupi.springbootinit.service.YuqueBookService;
import com.yupi.springbootinit.service.YuqueDocService;
import com.yupi.springbootinit.service.YuqueTocService;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class YuqueDocServiceImpl extends ServiceImpl<YuqueDocMapper, YuqueDoc> implements YuqueDocService {

    @Resource
    private YuqueBookService yuqueBookService;

    @Resource
    private YuqueTocService yuqueTocService;

    @Override
    public List<YuqueTocVO> listToc(String bookSlug, User loginUser) {
        YuqueBook book = yuqueBookService.getValidBookBySlug(bookSlug);
        checkBookAccess(book, loginUser);
        return yuqueTocService.list(new QueryWrapper<YuqueToc>()
                        .eq("bookId", book.getId())
                        .eq("isDelete", 0)
                        .orderByAsc("sort")
                        .orderByAsc("id"))
                .stream()
                .map(this::toTocVO)
                .collect(Collectors.toList());
    }

    @Override
    public YuqueDocVO getDoc(String bookSlug, String docSlug, User loginUser) {
        if (StringUtils.isAnyBlank(bookSlug, docSlug)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        YuqueBook book = yuqueBookService.getValidBookBySlug(bookSlug);
        checkBookAccess(book, loginUser);
        YuqueDoc doc = this.getOne(new QueryWrapper<YuqueDoc>()
                .eq("bookId", book.getId())
                .eq("slug", docSlug)
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        ThrowUtils.throwIf(doc == null, ErrorCode.NOT_FOUND_ERROR);
        checkDocAccess(doc, loginUser);
        return toDocVO(doc);
    }

    @Override
    public List<YuqueDocVO> searchDocs(String keyword, User loginUser) {
        if (StringUtils.isBlank(keyword)) {
            return Collections.emptyList();
        }
        List<Long> visibleBookIds = getVisibleBookIds(loginUser);
        if (visibleBookIds.isEmpty()) {
            return Collections.emptyList();
        }
        QueryWrapper<YuqueDoc> queryWrapper = new QueryWrapper<>();
        queryWrapper.in("bookId", visibleBookIds)
                .eq("isDelete", 0)
                .eq(!isAdmin(loginUser), "status", YuqueDocConstant.STATUS_ONLINE)
                .and(wrapper -> wrapper.like("title", keyword)
                        .or()
                        .like("description", keyword)
                        .or()
                        .like("bodyMarkdown", keyword))
                .orderByDesc("updateTime")
                .last("LIMIT 20");
        applyDocVisibility(queryWrapper, loginUser);
        return this.list(queryWrapper).stream().map(this::toDocVO).collect(Collectors.toList());
    }

    @Override
    public Boolean updateDoc(YuqueDocUpdateRequest request) {
        if (request == null || request.getId() == null || request.getId() <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        YuqueDoc existing = this.getOne(new QueryWrapper<YuqueDoc>()
                .eq("id", request.getId())
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        ThrowUtils.throwIf(existing == null, ErrorCode.NOT_FOUND_ERROR);
        YuqueDoc update = new YuqueDoc();
        update.setId(existing.getId());
        if (StringUtils.isNotBlank(request.getTitle())) {
            update.setTitle(request.getTitle().trim());
        }
        update.setDescription(request.getDescription());
        update.setCoverUrl(request.getCoverUrl());
        if (StringUtils.isNotBlank(request.getVisibility())) {
            update.setVisibility(normalizeVisibility(request.getVisibility()));
        }
        if (StringUtils.isNotBlank(request.getStatus())) {
            update.setStatus(normalizeStatus(request.getStatus()));
        }
        boolean result = this.updateById(update);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    private List<Long> getVisibleBookIds(User loginUser) {
        QueryWrapper<YuqueBook> queryWrapper = new QueryWrapper<>();
        queryWrapper.select("id").eq("isDelete", 0);
        if (!isAdmin(loginUser)) {
            queryWrapper.eq("status", YuqueDocConstant.STATUS_ONLINE);
            if (loginUser == null) {
                queryWrapper.eq("visibility", YuqueDocConstant.VISIBILITY_PUBLIC);
            } else {
                queryWrapper.in("visibility", YuqueDocConstant.VISIBILITY_PUBLIC,
                        YuqueDocConstant.VISIBILITY_LOGIN);
            }
        }
        return yuqueBookService.list(queryWrapper).stream().map(YuqueBook::getId).collect(Collectors.toList());
    }

    private void checkBookAccess(YuqueBook book, User loginUser) {
        if (!isAdmin(loginUser) && !YuqueDocConstant.STATUS_ONLINE.equals(book.getStatus())) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        checkVisibility(book.getVisibility(), loginUser);
    }

    private void checkDocAccess(YuqueDoc doc, User loginUser) {
        if (!isAdmin(loginUser) && !YuqueDocConstant.STATUS_ONLINE.equals(doc.getStatus())) {
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        }
        checkVisibility(doc.getVisibility(), loginUser);
    }

    private void checkVisibility(String visibility, User loginUser) {
        String safeVisibility = normalizeVisibility(visibility);
        if (YuqueDocConstant.VISIBILITY_PUBLIC.equals(safeVisibility)) {
            return;
        }
        if (loginUser == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        }
        if (YuqueDocConstant.VISIBILITY_ADMIN.equals(safeVisibility) && !isAdmin(loginUser)) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR);
        }
    }

    private void applyDocVisibility(QueryWrapper<YuqueDoc> queryWrapper, User loginUser) {
        if (isAdmin(loginUser)) {
            return;
        }
        if (loginUser == null) {
            queryWrapper.eq("visibility", YuqueDocConstant.VISIBILITY_PUBLIC);
            return;
        }
        queryWrapper.in("visibility", YuqueDocConstant.VISIBILITY_PUBLIC, YuqueDocConstant.VISIBILITY_LOGIN);
    }

    private boolean isAdmin(User loginUser) {
        return loginUser != null && UserConstant.ADMIN_ROLE.equals(loginUser.getUserRole());
    }

    private String normalizeVisibility(String value) {
        if (YuqueDocConstant.VISIBILITY_LOGIN.equals(value) || YuqueDocConstant.VISIBILITY_ADMIN.equals(value)) {
            return value;
        }
        return YuqueDocConstant.VISIBILITY_PUBLIC;
    }

    private String normalizeStatus(String value) {
        if (YuqueDocConstant.STATUS_OFFLINE.equals(value)) {
            return value;
        }
        return YuqueDocConstant.STATUS_ONLINE;
    }

    private YuqueDocVO toDocVO(YuqueDoc doc) {
        YuqueDocVO vo = new YuqueDocVO();
        BeanUtils.copyProperties(doc, vo);
        return vo;
    }

    private YuqueTocVO toTocVO(YuqueToc toc) {
        YuqueTocVO vo = new YuqueTocVO();
        BeanUtils.copyProperties(toc, vo);
        return vo;
    }
}
