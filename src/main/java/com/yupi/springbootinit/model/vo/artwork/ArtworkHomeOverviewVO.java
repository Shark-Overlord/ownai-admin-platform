package com.yupi.springbootinit.model.vo.artwork;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;
import lombok.Data;

@Data
public class ArtworkHomeOverviewVO implements Serializable {

    private Long totalCount = 0L;

    private Long recentThreeDaysCount = 0L;

    private List<ArtworkListVO> recentItems = new ArrayList<>();

    private static final long serialVersionUID = 1L;
}
