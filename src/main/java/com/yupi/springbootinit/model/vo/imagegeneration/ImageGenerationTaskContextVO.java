package com.yupi.springbootinit.model.vo.imagegeneration;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class ImageGenerationTaskContextVO implements Serializable {

    private ImageGenerationMessageVO task;

    private ImageGenerationProviderConfigVO providerConfig;

    private Map<String, Object> providerRequest;

    private List<ImageGenerationMessageVO> contextMessages = new ArrayList<>();

    private static final long serialVersionUID = 1L;
}
