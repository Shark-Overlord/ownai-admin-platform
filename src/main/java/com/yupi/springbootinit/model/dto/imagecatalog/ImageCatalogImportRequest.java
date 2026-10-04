package com.yupi.springbootinit.model.dto.imagecatalog;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class ImageCatalogImportRequest implements Serializable {
    private Long catalogVersionId;
    private String batchKey;
    private String sourceSha256;
    private String batchSha256;
    private List<MemberInput> members;

    @Data
    public static class MemberInput implements Serializable {
        private Long promptAssetId;
        private String sourceVersion;
        private String sourceUpdateTime;
        private Integer sourceStatus;
        private String inputSha256;
        private String decisionMethod;
        private String evidenceJson;
        private List<String> channelNames;
        private static final long serialVersionUID = 1L;
    }

    private static final long serialVersionUID = 1L;
}
