package com.yupi.springbootinit.model.vo.file;

import java.io.Serializable;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RemoteImageImportResultVO implements Serializable {

    private List<RemoteImageImportItemVO> items;

    private Integer successCount;

    private Integer failedCount;

    private static final long serialVersionUID = 1L;
}
