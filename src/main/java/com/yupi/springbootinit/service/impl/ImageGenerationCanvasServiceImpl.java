package com.yupi.springbootinit.service.impl;

import cn.hutool.json.JSONUtil;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.exception.ThrowUtils;
import com.yupi.springbootinit.mapper.ImageGenerationCanvasMapper;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationCanvasSaveRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationCanvas;
import com.yupi.springbootinit.model.entity.ImageGenerationMessage;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationCanvasVO;
import com.yupi.springbootinit.service.ImageGenerationCanvasService;
import com.yupi.springbootinit.service.ImageGenerationMessageService;
import java.util.Date;
import javax.annotation.Resource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ImageGenerationCanvasServiceImpl
        extends ServiceImpl<ImageGenerationCanvasMapper, ImageGenerationCanvas>
        implements ImageGenerationCanvasService {

    private static final int MAX_LAYOUT_JSON_LENGTH = 1024 * 1024;

    private static final int MAX_VIEWPORT_JSON_LENGTH = 64 * 1024;

    @Resource
    private ImageGenerationMessageService imageGenerationMessageService;

    @Override
    public ImageGenerationCanvasVO getCanvas(String conversationId, User loginUser) {
        String normalizedConversationId = normalizeConversationId(conversationId);
        validateConversationOwner(normalizedConversationId, loginUser.getId());
        ImageGenerationCanvas canvas = getUserCanvas(normalizedConversationId, loginUser.getId());
        if (canvas == null) {
            ImageGenerationCanvasVO emptyCanvas = new ImageGenerationCanvasVO();
            emptyCanvas.setUserId(loginUser.getId());
            emptyCanvas.setConversationId(normalizedConversationId);
            return emptyCanvas;
        }
        return toVO(canvas);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public ImageGenerationCanvasVO saveCanvas(ImageGenerationCanvasSaveRequest request, User loginUser) {
        if (request == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        String normalizedConversationId = normalizeConversationId(request.getConversationId());
        validateConversationOwner(normalizedConversationId, loginUser.getId());
        String layoutJson = normalizeJson(request.getLayoutJson(), MAX_LAYOUT_JSON_LENGTH, "layoutJson");
        String viewportJson = normalizeJson(request.getViewportJson(), MAX_VIEWPORT_JSON_LENGTH, "viewportJson");
        Date now = new Date();
        ImageGenerationCanvas oldCanvas = getUserCanvas(normalizedConversationId, loginUser.getId());

        if (oldCanvas == null) {
            ImageGenerationCanvas canvas = new ImageGenerationCanvas();
            canvas.setUserId(loginUser.getId());
            canvas.setConversationId(normalizedConversationId);
            canvas.setLayoutJson(layoutJson);
            canvas.setViewportJson(viewportJson);
            canvas.setCreateTime(now);
            canvas.setUpdateTime(now);
            boolean result = this.save(canvas);
            ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
            return toVO(canvas);
        }

        ImageGenerationCanvas updateCanvas = new ImageGenerationCanvas();
        updateCanvas.setId(oldCanvas.getId());
        updateCanvas.setLayoutJson(layoutJson);
        updateCanvas.setViewportJson(viewportJson);
        updateCanvas.setUpdateTime(now);
        boolean result = this.updateById(updateCanvas);
        ThrowUtils.throwIf(!result, ErrorCode.OPERATION_ERROR);
        ImageGenerationCanvas savedCanvas = this.getById(oldCanvas.getId());
        return toVO(savedCanvas);
    }

    private ImageGenerationCanvas getUserCanvas(String conversationId, Long userId) {
        return this.getOne(new QueryWrapper<ImageGenerationCanvas>()
                .eq("conversationId", conversationId)
                .eq("userId", userId)
                .eq("isDelete", 0));
    }

    private void validateConversationOwner(String conversationId, Long userId) {
        long count = imageGenerationMessageService.count(new QueryWrapper<ImageGenerationMessage>()
                .eq("conversationId", conversationId)
                .eq("userId", userId)
                .eq("isDelete", 0));
        if (count <= 0) {
            throw new BusinessException(ErrorCode.NO_AUTH_ERROR, "Conversation not found");
        }
    }

    private String normalizeConversationId(String conversationId) {
        String normalizedConversationId = StringUtils.trimToNull(conversationId);
        if (normalizedConversationId == null || normalizedConversationId.length() > 64) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "Invalid conversationId");
        }
        return normalizedConversationId;
    }

    private String normalizeJson(String json, int maxLength, String fieldName) {
        String normalizedJson = StringUtils.trimToNull(json);
        if (normalizedJson == null) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, fieldName + " is required");
        }
        if (normalizedJson.length() > maxLength) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, fieldName + " is too large");
        }
        if (!JSONUtil.isTypeJSON(normalizedJson)) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR, fieldName + " must be valid JSON");
        }
        return normalizedJson;
    }

    private ImageGenerationCanvasVO toVO(ImageGenerationCanvas canvas) {
        if (canvas == null) {
            return null;
        }
        ImageGenerationCanvasVO vo = new ImageGenerationCanvasVO();
        BeanUtils.copyProperties(canvas, vo);
        return vo;
    }
}
