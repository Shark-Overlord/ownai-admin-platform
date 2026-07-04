package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyAddRequest;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyQueryRequest;
import com.yupi.springbootinit.model.dto.contentapikey.ContentApiKeyUpdateRequest;
import com.yupi.springbootinit.model.entity.ContentApiKey;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.contentapikey.ContentApiKeyCreateVO;
import com.yupi.springbootinit.model.vo.contentapikey.ContentApiKeyVO;
import java.util.List;
import javax.servlet.http.HttpServletRequest;

public interface ContentApiKeyService extends IService<ContentApiKey> {

    String HEADER_CONTENT_ASSET_KEY = "X-Content-Asset-Key";

    String HEADER_CONTENT_ASSET_SECRET = "X-Content-Asset-Secret";

    String SCOPE_ALL = "*";

    String SCOPE_ARTWORK_ADD = "artwork:add";

    String SCOPE_ARTWORK_UPDATE = "artwork:update";

    String SCOPE_PROMPT_ASSET_ADD = "prompt_asset:add";

    String SCOPE_PROMPT_ASSET_UPDATE = "prompt_asset:update";

    ContentApiKeyCreateVO addKey(ContentApiKeyAddRequest request, User loginUser);

    Boolean updateKey(ContentApiKeyUpdateRequest request);

    Page<ContentApiKeyVO> listKeyByPage(ContentApiKeyQueryRequest request);

    Boolean deleteKey(Long id);

    boolean validateRequestKey(String requestKey, HttpServletRequest request, String requiredScope);

    boolean validateRequestKeyAny(String requestKey, HttpServletRequest request, List<String> requiredScopes);
}
