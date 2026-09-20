package com.yupi.springbootinit.controller;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.enums.MemberLevelEnum;
import com.yupi.springbootinit.service.*;
import java.io.IOException;
import java.util.*;
import jakarta.servlet.http.*;
import org.apache.commons.lang3.StringUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/promptAsset")
public class PromptAssetDownloadController {
    private final UserService users;
    private final ResourceAnalyticsService analytics;
    private final ResourceDownloadService downloads;
    private final JdbcTemplate db;
    public PromptAssetDownloadController(UserService users,ResourceAnalyticsService analytics,ResourceDownloadService downloads,JdbcTemplate db) {
        this.users=users;this.analytics=analytics;this.downloads=downloads;this.db=db;
    }
    @GetMapping("/source/download")
    public void download(@RequestParam long id,@RequestParam(required=false) Long mediaId,HttpServletRequest request,HttpServletResponse response) throws IOException {
        User user=users.getLoginUser(request);
        downloads.download("image_prompt",id,mediaId,user,()->source(id,mediaId,user),"prompt-image-"+id,response);
    }
    String source(long id,Long mediaId,User user) {
        Map<String,Object> asset=analytics.requirePublished("image_prompt",id);
        if (asset.get("memberOnly")!=null && ((Number)asset.get("memberOnly")).intValue()==1) {
            MemberLevelEnum level=MemberLevelEnum.getEnumByValue(user.getMemberLevel());
            if(level==null || !level.canAccessMemberContent() || (user.getMemberExpireTime()!=null && user.getMemberExpireTime().before(new Date())))
                throw new BusinessException(ErrorCode.NO_AUTH_ERROR,"请开通会员后下载");
        }
        List<Map<String,Object>> media=mediaId==null
                ? db.queryForList("SELECT cloudUrl,originalUrl FROM prompt_asset_media WHERE promptAssetId=? AND isDelete=0 AND mediaType='image' ORDER BY sort,id LIMIT 1",id)
                : db.queryForList("SELECT cloudUrl,originalUrl FROM prompt_asset_media WHERE promptAssetId=? AND id=? AND isDelete=0 AND mediaType='image'",id,mediaId);
        if(mediaId!=null && media.isEmpty()) throw new BusinessException(ErrorCode.NOT_FOUND_ERROR,"原图暂不可下载");
        if(!media.isEmpty()) {
            for(String field:Arrays.asList("cloudUrl","originalUrl")) {
                String value=(String)media.get(0).get(field);
                if(StringUtils.isNotBlank(value)) return value;
            }
        }
        if(mediaId==null) for(String field:Arrays.asList("sourceCloudStorageUrl","sourceImageOriginalUrl")) {
            String value=(String)asset.get(field);
            if(StringUtils.isNotBlank(value)) return value;
        }
        throw new BusinessException(ErrorCode.NOT_FOUND_ERROR,"原图暂不可下载");
    }
}
