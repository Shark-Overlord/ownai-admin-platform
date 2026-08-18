package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.blog.BlogPostAddRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostUpdateRequest;
import com.yupi.springbootinit.model.entity.BlogPost;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.blog.BlogPostVO;
import java.util.List;

public interface BlogPostService extends IService<BlogPost> {

    Long addPost(BlogPostAddRequest request, User adminUser);

    Boolean updatePost(BlogPostUpdateRequest request);

    Boolean deletePost(Long id);

    Boolean publishPost(Long id, User adminUser);

    Integer batchPublishPosts(List<Long> ids, User adminUser);

    Integer batchDeletePosts(List<Long> ids);

    Integer batchSetMemberOnly(List<Long> ids, Integer memberOnly);

    Boolean offlinePost(Long id);

    Page<BlogPostVO> listAdminPosts(BlogPostQueryRequest request);

    BlogPostVO getAdminPost(Long id);

    Page<BlogPostVO> listPublishedPosts(BlogPostQueryRequest request, User loginUser);

    BlogPostVO getPublishedPost(String slug, User loginUser);

    List<BlogPostVO> listAdminPostsByChapterIds(List<Long> chapterIds);

    List<BlogPostVO> listPublishedPostsByChapterIds(List<Long> chapterIds, User loginUser);
}
