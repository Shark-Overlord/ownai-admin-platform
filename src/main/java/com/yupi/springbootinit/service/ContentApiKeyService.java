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

    String SCOPE_ARTWORK_READ = "artwork:read";

    String SCOPE_ARTWORK_UPLOAD = "artwork:upload";

    String SCOPE_PROMPT_ASSET_ADD = "prompt_asset:add";

    String SCOPE_PROMPT_ASSET_UPDATE = "prompt_asset:update";

    String SCOPE_PROMPT_ASSET_READ = "prompt_asset:read";

    String SCOPE_PROMPT_ASSET_UPLOAD = "prompt_asset:upload";

    String SCOPE_VIDEO_BACKGROUND_READ = "video_background:read";

    String SCOPE_VIDEO_BACKGROUND_ADD = "video_background:add";

    String SCOPE_VIDEO_BACKGROUND_UPDATE = "video_background:update";

    String SCOPE_VIDEO_BACKGROUND_UPLOAD = "video_background:upload";

    String SCOPE_COMMUNITY_POST_READ = "community_post:read";

    String SCOPE_COMMUNITY_POST_ADD = "community_post:add";

    String SCOPE_COMMUNITY_POST_UPDATE = "community_post:update";

    String SCOPE_COMMUNITY_POST_UPLOAD = "community_post:upload";

    String SCOPE_TUTORIAL_READ = "tutorial:read";

    String SCOPE_TUTORIAL_ADD = "tutorial:add";

    String SCOPE_TUTORIAL_UPDATE = "tutorial:update";

    String SCOPE_TUTORIAL_UPLOAD = "tutorial:upload";

    String SCOPE_TAXONOMY_READ = "taxonomy:read";

    ContentApiKeyCreateVO addKey(ContentApiKeyAddRequest request, User loginUser);

    Boolean updateKey(ContentApiKeyUpdateRequest request);

    Page<ContentApiKeyVO> listKeyByPage(ContentApiKeyQueryRequest request);

    Boolean deleteKey(Long id);

    boolean validateRequestKey(String requestKey, HttpServletRequest request, String requiredScope);

    boolean validateRequestKeyAny(String requestKey, HttpServletRequest request, List<String> requiredScopes);

    /** Authenticate the dedicated header used by the unified content API. */
    ContentApiKey requireRequestKey(HttpServletRequest request, List<String> requiredScopes);
}
