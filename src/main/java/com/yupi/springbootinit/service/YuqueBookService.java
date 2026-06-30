package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.yuque.YuqueBookSaveRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.YuqueBook;
import com.yupi.springbootinit.model.vo.yuque.YuqueBookVO;
import java.util.List;

public interface YuqueBookService extends IService<YuqueBook> {

    List<YuqueBookVO> listVisibleBooks(User loginUser);

    Long saveBook(YuqueBookSaveRequest request);

    Boolean deleteBook(Long id);

    Boolean syncBook(Long id);

    Boolean syncAllEnabledBooks();

    YuqueBook getValidBookBySlug(String slug);
}
