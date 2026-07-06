package com.yupi.springbootinit.model.vo.promptasset;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class PromptAssetHomeOverviewVO implements Serializable {

    private Long totalCount = 0L;

    private Long todayNewCount = 0L;

    private List<PromptAssetVO> latestItems = new ArrayList<>();

    private static final long serialVersionUID = 1L;
}
