package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class ImageGenerationConversationVO implements Serializable {

    private String conversationId;

    private Long userId;

    private List<ImageGenerationMessageVO> messages = new ArrayList<>();

    private static final long serialVersionUID = 1L;
}
