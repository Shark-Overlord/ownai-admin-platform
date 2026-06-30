package com.yupi.springbootinit.model.dto.yuque;

import java.io.Serializable;
import lombok.Data;

@Data
public class YuqueSyncRequest implements Serializable {

    private Long bookId;

    private static final long serialVersionUID = 1L;
}
