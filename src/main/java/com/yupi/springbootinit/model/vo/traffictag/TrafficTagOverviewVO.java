package com.yupi.springbootinit.model.vo.traffictag;

import java.io.Serializable;
import java.util.List;
import java.util.Map;
import lombok.Data;

@Data
public class TrafficTagOverviewVO implements Serializable {

    private List<TrafficTagVO> items;
    private Map<String, Long> platformCounts;
    private Map<String, Long> categoryCounts;
    private long total;

    private static final long serialVersionUID = 1L;
}
