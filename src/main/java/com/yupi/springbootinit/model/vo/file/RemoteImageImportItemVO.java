package com.yupi.springbootinit.model.vo.file;

import java.io.Serializable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RemoteImageImportItemVO implements Serializable {

    private String sourceUrl;

    private String storedUrl;

    private Boolean success;

    private String message;

    private static final long serialVersionUID = 1L;
}
