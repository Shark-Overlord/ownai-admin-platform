package com.yupi.springbootinit.service;

import com.yupi.springbootinit.model.dto.home.HomeContentConfigDTO;
import com.yupi.springbootinit.model.vo.home.HomeContentVO;

public interface HomeContentService {

    HomeContentVO getPublicContent();

    HomeContentConfigDTO getAdminConfig();

    boolean saveAdminConfig(HomeContentConfigDTO config);
}
