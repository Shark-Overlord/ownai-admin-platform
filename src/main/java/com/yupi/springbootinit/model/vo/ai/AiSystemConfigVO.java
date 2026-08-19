package com.yupi.springbootinit.model.vo.ai;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class AiSystemConfigVO implements Serializable {
    private AiProviderConfigVO provider;
    private List<AiTaskConfigVO> tasks = new ArrayList<>();
    private static final long serialVersionUID = 1L;
}
