package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.dto.imagegeneration.ImageGenerationCanvasSaveRequest;
import com.yupi.springbootinit.model.entity.ImageGenerationCanvas;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.vo.imagegeneration.ImageGenerationCanvasVO;

public interface ImageGenerationCanvasService extends IService<ImageGenerationCanvas> {

    ImageGenerationCanvasVO getCanvas(String conversationId, User loginUser);

    ImageGenerationCanvasVO saveCanvas(ImageGenerationCanvasSaveRequest request, User loginUser);
}
