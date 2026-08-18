package com.yupi.springbootinit.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.BlogPostTagMapper;
import com.yupi.springbootinit.mapper.BlogPostMapper;
import com.yupi.springbootinit.mapper.BlogTagMapper;
import com.yupi.springbootinit.model.dto.blog.BlogTagSaveRequest;
import com.yupi.springbootinit.model.entity.BlogPostTag;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.entity.BlogTag;
import com.yupi.springbootinit.model.vo.blog.BlogTagVO;
import com.yupi.springbootinit.service.BlogTagService;
import java.util.List;
import java.util.stream.Collectors;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;

@Service
public class BlogTagServiceImpl extends ServiceImpl<BlogTagMapper, BlogTag> implements BlogTagService {

    private static final String STATUS_ENABLED = "enabled";
    private static final String STATUS_DISABLED = "disabled";

    @Resource
    private BlogPostTagMapper blogPostTagMapper;

    @Resource
    private BlogPostMapper blogPostMapper;

    @Override
    public Long saveTag(BlogTagSaveRequest request) {
        validate(request);
        Long id = request.getId();
        QueryWrapper<BlogTag> duplicate = new QueryWrapper<BlogTag>()
                .eq("isDelete", 0)
                .and(w -> w.eq("name", request.getName().trim()).or().eq("slug", request.getSlug().trim()));
        duplicate.ne(id != null, "id", id);
        ThrowUtils.throwIf(this.count(duplicate) > 0, ErrorCode.PARAMS_ERROR, "博客标签名称或 slug 已存在");
        BlogTag tag = new BlogTag();
        BeanUtils.copyProperties(request, tag);
        tag.setName(request.getName().trim());
        tag.setSlug(request.getSlug().trim().toLowerCase());
        tag.setStatus(StringUtils.defaultIfBlank(request.getStatus(), STATUS_ENABLED));
        tag.setSort(request.getSort() == null ? 0 : request.getSort());
        boolean result = id == null ? this.save(tag) : this.updateById(tag);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        return tag.getId();
    }

    @Override
    public Boolean deleteTag(Long id) {
        BlogTag tag = getValid(id);
        long postCount = blogPostTagMapper.selectCount(new QueryWrapper<BlogPostTag>().eq("tagId", tag.getId()));
        ThrowUtils.throwIf(postCount > 0, ErrorCode.OPERATION_ERROR, "标签仍被文章使用，不能删除");
        return this.removeById(tag.getId());
    }

    @Override
    public List<BlogTagVO> listTags(boolean admin) {
        QueryWrapper<BlogTag> wrapper = new QueryWrapper<BlogTag>()
                .eq("isDelete", 0)
                .eq(!admin, "status", STATUS_ENABLED)
                .orderByAsc("sort").orderByAsc("id");
        return this.list(wrapper).stream().map(item -> {
            BlogTagVO vo = new BlogTagVO();
            BeanUtils.copyProperties(item, vo);
            List<Long> postIds = blogPostTagMapper.selectList(new QueryWrapper<BlogPostTag>().eq("tagId", item.getId()))
                    .stream().map(BlogPostTag::getPostId).distinct().collect(Collectors.toList());
            if (admin) {
                vo.setPostCount((long) postIds.size());
            } else if (postIds.isEmpty()) {
                vo.setPostCount(0L);
            } else {
                vo.setPostCount(blogPostMapper.selectCount(new QueryWrapper<BlogPost>()
                        .in("id", postIds).eq("status", "published").eq("isDelete", 0)));
            }
            return vo;
        }).collect(Collectors.toList());
    }

    private BlogTag getValid(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        BlogTag tag = this.getById(id);
        ThrowUtils.throwIf(tag == null, ErrorCode.NOT_FOUND_ERROR);
        return tag;
    }

    private void validate(BlogTagSaveRequest request) {
        if (request == null || StringUtils.isBlank(request.getName()) || request.getName().trim().length() > 100) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "标签名称不能为空且不能超过 100 字");
        }
        if (StringUtils.isBlank(request.getSlug()) || request.getSlug().length() > 100
                || !request.getSlug().matches("[a-z0-9]+(?:-[a-z0-9]+)*")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "slug 仅支持小写字母、数字和中划线");
        }
        String status = StringUtils.defaultIfBlank(request.getStatus(), STATUS_ENABLED);
        if (!STATUS_ENABLED.equals(status) && !STATUS_DISABLED.equals(status)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "标签状态不合法");
        }
    }
}
