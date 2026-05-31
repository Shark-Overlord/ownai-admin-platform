package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationCreateRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationMessageQueryRequest;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationTaskUpdateRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationMessage;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationConversationVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationConversationSummaryVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationCreateVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationMessageVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationMonitorOverviewVO;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationTaskContextVO;

public interface ImageGenerationMessageService extends IService<ImageGenerationMessage> {

    ImageGenerationCreateVO createGeneration(ImageGenerationCreateRequest request, User loginUser);

    ImageGenerationConversationVO getCurrentConversation(User loginUser);

    ImageGenerationConversationVO getConversation(String conversationId, User loginUser);

    Page<ImageGenerationMessageVO> listAdminMessageVOByPage(ImageGenerationMessageQueryRequest request);

    ImageGenerationMessageVO getAdminMessageVO(Long id);

    ImageGenerationMonitorOverviewVO getAdminMonitorOverview(ImageGenerationMessageQueryRequest request);

    Page<ImageGenerationConversationSummaryVO> listAdminConversationVOByPage(ImageGenerationMessageQueryRequest request);

    ImageGenerationConversationVO getAdminConversation(String conversationId, Long userId);

    Page<ImageGenerationTaskContextVO> listPendingTaskContextByPage(ImageGenerationMessageQueryRequest request);

    ImageGenerationMessageVO updateTaskResult(ImageGenerationTaskUpdateRequest request);

    int recoverStaleRunningTasks(int timeoutMinutes);
}
