package com.yupi.springbootinit.service.impl;

import cn.hutool.json.JSONArray;
import cn.hutool.json.JSONObject;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.config.YuqueProperties;
import com.yupi.springbootinit.constant.UserConstant;
import com.yupi.springbootinit.constant.YuqueDocConstant;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.manager.YuqueClient;
import com.yupi.springbootinit.mapper.YuqueBookMapper;
import com.yupi.springbootinit.mapper.YuqueDocMapper;
import com.yupi.springbootinit.model.dto.yuque.YuqueBookSaveRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.YuqueBook;
import com.yupi.springbootinit.model.entity.YuqueDoc;
import com.yupi.springbootinit.model.entity.YuqueToc;
import com.yupi.springbootinit.model.vo.yuque.YuqueBookVO;
import com.yupi.springbootinit.service.YuqueBookService;
import com.yupi.springbootinit.service.YuqueTocService;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class YuqueBookServiceImpl extends ServiceImpl<YuqueBookMapper, YuqueBook> implements YuqueBookService {

    @Resource
    private YuqueProperties yuqueProperties;

    @Resource
    private YuqueClient yuqueClient;

    @Resource
    private YuqueDocMapper yuqueDocMapper;

    @Resource
    private YuqueTocService yuqueTocService;

    @Override
    public List<YuqueBookVO> listVisibleBooks(User loginUser) {
        QueryWrapper<YuqueBook> queryWrapper = new QueryWrapper<>();
        queryWrapper.eq("isDelete", 0)
                .eq("status", YuqueDocConstant.STATUS_ONLINE)
                .orderByDesc("updateTime")
                .orderByDesc("id");
        applyVisibility(queryWrapper, loginUser);
        return this.list(queryWrapper).stream().map(this::toVO).collect(Collectors.toList());
    }

    @Override
    public Long saveBook(YuqueBookSaveRequest request) {
        if (request == null || StringUtils.isAnyBlank(request.getNamespace(), request.getSlug(), request.getName())) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        YuqueBook book = new YuqueBook();
        BeanUtils.copyProperties(request, book);
        normalizeBook(book);
        boolean result;
        if (book.getId() == null) {
            result = this.save(book);
        } else {
            getValidBook(book.getId());
            result = this.updateById(book);
        }
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return book.getId();
    }

    @Override
    public Boolean deleteBook(Long id) {
        YuqueBook book = getValidBook(id);
        boolean result = this.removeById(book.getId());
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return true;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public synchronized Boolean syncBook(Long id) {
        YuqueBook book = getValidBook(id);
        Date now = new Date();
        JSONArray docList = yuqueClient.listDocs(book.getNamespace());
        Map<String, YuqueDoc> docMap = new LinkedHashMap<>();
        for (Object item : docList) {
            if (!(item instanceof JSONObject)) {
                continue;
            }
            JSONObject docSummary = (JSONObject) item;
            String slug = yuqueClient.getString(docSummary, "slug");
            if (StringUtils.isBlank(slug)) {
                continue;
            }
            JSONObject detail = yuqueClient.getDoc(book.getNamespace(), slug);
            YuqueDoc doc = buildDoc(book, docSummary, detail, now);
            upsertDoc(doc);
            docMap.put(doc.getSlug(), doc);
        }
        syncToc(book, docMap, now);
        YuqueBook update = new YuqueBook();
        update.setId(book.getId());
        update.setLastSyncAt(now);
        this.updateById(update);
        return true;
    }

    @Override
    public synchronized Boolean syncAllEnabledBooks() {
        List<YuqueBook> books = this.list(new QueryWrapper<YuqueBook>()
                .eq("isDelete", 0)
                .eq("status", YuqueDocConstant.STATUS_ONLINE));
        if (books == null || books.isEmpty()) {
            return true;
        }
        for (YuqueBook book : books) {
            syncBook(book.getId());
        }
        return true;
    }

    @Override
    public YuqueBook getValidBookBySlug(String slug) {
        if (StringUtils.isBlank(slug)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        YuqueBook book = this.getOne(new QueryWrapper<YuqueBook>()
                .eq("slug", slug)
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.NOT_FOUND_ERROR);
        return book;
    }

    private YuqueBook getValidBook(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        YuqueBook book = this.getOne(new QueryWrapper<YuqueBook>()
                .eq("id", id)
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        ThrowUtils.throwIf(book == null, ErrorCode.NOT_FOUND_ERROR);
        return book;
    }

    private void normalizeBook(YuqueBook book) {
        book.setNamespace(book.getNamespace().trim());
        book.setSlug(book.getSlug().trim());
        book.setName(book.getName().trim());
        book.setVisibility(normalizeVisibility(book.getVisibility()));
        book.setStatus(normalizeStatus(book.getStatus()));
    }

    private YuqueDoc buildDoc(YuqueBook book, JSONObject summary, JSONObject detail, Date now) {
        JSONObject source = detail == null || detail.isEmpty() ? summary : detail;
        YuqueDoc doc = new YuqueDoc();
        doc.setBookId(book.getId());
        doc.setYuqueDocId(yuqueClient.getString(source, "id"));
        doc.setSlug(StringUtils.defaultIfBlank(yuqueClient.getString(source, "slug"),
                yuqueClient.getString(summary, "slug")));
        doc.setTitle(StringUtils.defaultIfBlank(yuqueClient.getString(source, "title"),
                yuqueClient.getString(summary, "title")));
        doc.setDescription(StringUtils.defaultIfBlank(yuqueClient.getString(source, "description", "summary"),
                yuqueClient.getString(summary, "description", "summary")));
        doc.setBodyMarkdown(yuqueClient.getString(source, "body", "body_draft", "markdown"));
        doc.setBodyHtml(yuqueClient.getString(source, "body_html", "bodyHtml"));
        doc.setCoverUrl(yuqueClient.getString(source, "cover", "coverUrl", "cover_url"));
        doc.setVisibility(book.getVisibility());
        doc.setStatus(YuqueDocConstant.STATUS_ONLINE);
        doc.setSourceUpdatedAt(yuqueClient.getDate(source, "updated_at", "updatedAt"));
        doc.setLastSyncAt(now);
        return doc;
    }

    private void upsertDoc(YuqueDoc doc) {
        YuqueDoc existing = yuqueDocMapper.selectOne(new QueryWrapper<YuqueDoc>()
                .eq("bookId", doc.getBookId())
                .eq("slug", doc.getSlug())
                .eq("isDelete", 0)
                .last("LIMIT 1"));
        if (existing != null) {
            doc.setId(existing.getId());
            yuqueDocMapper.updateById(doc);
        } else {
            yuqueDocMapper.insert(doc);
        }
    }

    private void syncToc(YuqueBook book, Map<String, YuqueDoc> docMap, Date now) {
        yuqueTocService.remove(new QueryWrapper<YuqueToc>().eq("bookId", book.getId()));
        JSONArray tocArray = yuqueClient.listToc(book.getNamespace());
        List<YuqueToc> tocList = new ArrayList<>();
        if (tocArray == null || tocArray.isEmpty()) {
            tocList = buildTocFromDocs(book, docMap);
        } else {
            int index = 0;
            for (Object item : tocArray) {
                if (!(item instanceof JSONObject)) {
                    continue;
                }
                JSONObject tocItem = (JSONObject) item;
                String slug = StringUtils.defaultIfBlank(yuqueClient.getString(tocItem, "slug"),
                        yuqueClient.getString(tocItem, "doc_slug"));
                YuqueDoc doc = docMap.get(slug);
                YuqueToc toc = new YuqueToc();
                toc.setBookId(book.getId());
                toc.setDocId(doc == null ? null : doc.getId());
                toc.setTitle(StringUtils.defaultIfBlank(yuqueClient.getString(tocItem, "title"),
                        doc == null ? slug : doc.getTitle()));
                toc.setSlug(slug);
                toc.setDepth(tocItem.getInt("depth", 1));
                toc.setSort(index++);
                toc.setCreateTime(now);
                toc.setUpdateTime(now);
                tocList.add(toc);
            }
        }
        if (!tocList.isEmpty()) {
            yuqueTocService.saveBatch(tocList);
        }
    }

    private List<YuqueToc> buildTocFromDocs(YuqueBook book, Map<String, YuqueDoc> docMap) {
        if (docMap == null || docMap.isEmpty()) {
            return Collections.emptyList();
        }
        List<YuqueToc> tocList = new ArrayList<>();
        int index = 0;
        for (YuqueDoc doc : docMap.values()) {
            YuqueToc toc = new YuqueToc();
            toc.setBookId(book.getId());
            toc.setDocId(doc.getId());
            toc.setTitle(doc.getTitle());
            toc.setSlug(doc.getSlug());
            toc.setDepth(1);
            toc.setSort(index++);
            tocList.add(toc);
        }
        return tocList;
    }

    private void applyVisibility(QueryWrapper<YuqueBook> queryWrapper, User loginUser) {
        if (loginUser != null && UserConstant.ADMIN_ROLE.equals(loginUser.getUserRole())) {
            return;
        }
        if (loginUser != null) {
            queryWrapper.in("visibility", YuqueDocConstant.VISIBILITY_PUBLIC, YuqueDocConstant.VISIBILITY_LOGIN);
            return;
        }
        queryWrapper.eq("visibility", YuqueDocConstant.VISIBILITY_PUBLIC);
    }

    private String normalizeVisibility(String value) {
        String visibility = StringUtils.defaultIfBlank(value, yuqueProperties.getDefaultVisibility());
        if (YuqueDocConstant.VISIBILITY_PUBLIC.equals(visibility)
                || YuqueDocConstant.VISIBILITY_LOGIN.equals(visibility)
                || YuqueDocConstant.VISIBILITY_ADMIN.equals(visibility)) {
            return visibility;
        }
        return YuqueDocConstant.VISIBILITY_PUBLIC;
    }

    private String normalizeStatus(String value) {
        String status = StringUtils.defaultIfBlank(value, YuqueDocConstant.STATUS_ONLINE);
        if (YuqueDocConstant.STATUS_ONLINE.equals(status) || YuqueDocConstant.STATUS_OFFLINE.equals(status)) {
            return status;
        }
        return YuqueDocConstant.STATUS_ONLINE;
    }

    private YuqueBookVO toVO(YuqueBook book) {
        YuqueBookVO vo = new YuqueBookVO();
        BeanUtils.copyProperties(book, vo);
        return vo;
    }
}
