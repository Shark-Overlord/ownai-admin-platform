package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.blog.BlogBookQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogBookSaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogChapterSaveRequest;
import com.yupi.springbootinit.model.dto.blog.BlogOutlineReorderRequest;
import com.yupi.springbootinit.model.entity.BlogBook;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.blog.BlogBookVO;
import com.yupi.springbootinit.model.vo.blog.BlogChapterVO;
import java.util.List;

public interface BlogBookService extends IService<BlogBook> {

    Page<BlogBookVO> listAdminBooks(BlogBookQueryRequest request);

    BlogBookVO getAdminBook(Long id);

    Long saveBook(BlogBookSaveRequest request, User adminUser);

    Boolean deleteBook(Long id);

    Long saveChapter(BlogChapterSaveRequest request);

    List<BlogChapterVO> listChapters(Long bookId);

    Boolean deleteChapter(Long id);

    Boolean reorderOutline(BlogOutlineReorderRequest request);

    Boolean assignPost(Long postId, Long chapterId);

    Page<BlogBookVO> listPublishedBooks(BlogBookQueryRequest request, User loginUser);

    BlogBookVO getPublishedBook(String slug, User loginUser);
}
