package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.yuque.YuqueDocUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.YuqueDoc;
import com.yupi.springbootinit.model.vo.yuque.YuqueDocVO;
import com.yupi.springbootinit.model.vo.yuque.YuqueTocVO;
import java.util.List;

public interface YuqueDocService extends IService<YuqueDoc> {

    List<YuqueTocVO> listToc(String bookSlug, User loginUser);

    YuqueDocVO getDoc(String bookSlug, String docSlug, User loginUser);

    List<YuqueDocVO> searchDocs(String keyword, User loginUser);

    Boolean updateDoc(YuqueDocUpdateRequest request);
}
