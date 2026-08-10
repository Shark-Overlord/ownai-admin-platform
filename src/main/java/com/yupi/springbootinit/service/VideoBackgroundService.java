package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundAddRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundQueryRequest;
import com.yupi.springbootinit.model.dto.videobackground.VideoBackgroundUpdateRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.VideoBackground;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundResourceVO;
import com.yupi.springbootinit.model.vo.videobackground.VideoBackgroundVO;
import java.util.List;

public interface VideoBackgroundService extends IService<VideoBackground> {
    long addVideoBackground(VideoBackgroundAddRequest request, User operator);
    boolean updateVideoBackground(VideoBackgroundUpdateRequest request, User operator);
    boolean deleteVideoBackground(long id);
    boolean publishVideoBackgroundBatch(List<Long> ids);
    boolean offlineVideoBackgroundBatch(List<Long> ids);
    boolean updateVideoBackgroundMemberOnlyBatch(List<Long> ids, Integer memberOnly);
    Page<VideoBackgroundVO> listVideoBackgroundVOByPage(VideoBackgroundQueryRequest request, User loginUser,
            boolean adminView);
    VideoBackgroundResourceVO getVideoBackgroundResource(Long id, User loginUser, String downloadUrl);
    String getVideoBackgroundSourceUrl(Long id, User loginUser);
}
