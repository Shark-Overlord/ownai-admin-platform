package com.yupi.springbootinit.model.dto.announcement;

import java.util.List;
import lombok.Data;

@Data
public class NewsPopupRequest {
    // Both guest exclusions and authenticated dismissal synchronization use the same ID list.
    private List<Long> ids;
}
