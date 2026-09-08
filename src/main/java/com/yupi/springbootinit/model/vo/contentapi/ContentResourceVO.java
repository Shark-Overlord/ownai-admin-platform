package com.yupi.springbootinit.model.vo.contentapi;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.Serializable;
import lombok.Data;

/** Resource plus an optimistic version token for a later update. */
@Data
public class ContentResourceVO implements Serializable {
    private String resourceType;
    private String id;
    private String version;
    private JsonNode resource;
    private static final long serialVersionUID = 1L;
}
