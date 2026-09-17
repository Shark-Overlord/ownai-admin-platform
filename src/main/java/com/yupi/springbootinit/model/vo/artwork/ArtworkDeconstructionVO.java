package com.yupi.springbootinit.model.vo.artwork;

import com.fasterxml.jackson.databind.JsonNode;
import java.io.Serializable;
import lombok.Data;

/** Full deep-deconstruction payload. Never include this object in artwork list responses. */
@Data
public class ArtworkDeconstructionVO implements Serializable {

    private Long id;

    private String title;

    private Integer isDeconstructed;

    private String deviceFrame;

    private String deconstructedPrompt;

    private JsonNode promptData;

    private JsonNode partsData;

    private JsonNode assetsData;

    private String htmlUrl;

    private String standaloneHtml;

    private static final long serialVersionUID = 1L;
}
