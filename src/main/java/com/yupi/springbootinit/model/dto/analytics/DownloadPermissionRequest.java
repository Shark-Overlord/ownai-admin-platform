package com.yupi.springbootinit.model.dto.analytics;

import lombok.Data;

@Data
public class DownloadPermissionRequest {
    private Long userId;
    private Boolean restricted;
    private String reason;
}
