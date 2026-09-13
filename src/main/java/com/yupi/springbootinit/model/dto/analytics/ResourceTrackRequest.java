package com.yupi.springbootinit.model.dto.analytics;

import lombok.Data;

@Data
public class ResourceTrackRequest {
    private String resourceType;
    private Long resourceId;
    private String action;
    private String visitorId;
    private String eventKey;
}
