package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.blog.BlogTagSaveRequest;
import com.yupi.springbootinit.model.entity.BlogTag;
import com.yupi.springbootinit.model.vo.blog.BlogTagVO;
import java.util.List;

public interface BlogTagService extends IService<BlogTag> {

    Long saveTag(BlogTagSaveRequest request);

    Boolean deleteTag(Long id);

    List<BlogTagVO> listTags(boolean admin);
}
