package com.yupi.springbootinit.model.dto.file;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

@Data
public class RemoteImageImportRequest implements Serializable {

    private List<String> urls;

    private static final long serialVersionUID = 1L;
}
