package com.yupi.springbootinit.model.dto.analytics;

import java.io.Serializable;
import lombok.Data;

@Data
public class PageViewTrackRequest implements Serializable {

    private String visitorId;

    private String pagePath;

    private String referrer;

    private String utmSource;

    private String utmMedium;

    private String utmCampaign;

    private static final long serialVersionUID = 1L;
}
