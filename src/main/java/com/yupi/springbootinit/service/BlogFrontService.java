package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.model.dto.blog.BlogFrontBookQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogFrontPostQueryRequest;
import com.yupi.springbootinit.model.dto.blog.BlogPostReadTrackRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookDetailVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontBookListVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontFiltersVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontOverviewVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostDetailVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogFrontPostOutlineVO;
import com.yupi.springbootinit.model.vo.blog.front.BlogPostReadResultVO;

public interface BlogFrontService {

    BlogFrontOverviewVO getOverview(User loginUser);

    Page<BlogFrontBookListVO> listBooks(BlogFrontBookQueryRequest request, User loginUser);

    BlogFrontBookDetailVO getBook(Long bookId, User loginUser);

    Page<BlogFrontPostOutlineVO> listPosts(BlogFrontPostQueryRequest request, User loginUser);

    BlogFrontPostDetailVO getPost(Long postId, User loginUser);

    BlogPostReadResultVO trackPostRead(BlogPostReadTrackRequest request, User loginUser);

    BlogFrontFiltersVO getFilters(User loginUser);

    Boolean addBookFavorite(Long bookId, User loginUser);

    Boolean cancelBookFavorite(Long bookId, User loginUser);

    Boolean isBookFavorited(Long bookId, User loginUser);

    Page<BlogFrontBookListVO> listMyFavoriteBooks(BlogFrontBookQueryRequest request, User loginUser);

    Boolean addPostFavorite(Long postId, User loginUser);

    Boolean cancelPostFavorite(Long postId, User loginUser);

    Boolean isPostFavorited(Long postId, User loginUser);

    Page<BlogFrontPostOutlineVO> listMyFavoritePosts(BlogFrontPostQueryRequest request, User loginUser);
}
