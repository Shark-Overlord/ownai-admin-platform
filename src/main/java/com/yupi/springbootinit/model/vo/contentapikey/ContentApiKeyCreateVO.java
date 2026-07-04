package com.yupi.springbootinit.model.vo.contentapikey;

import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class ContentApiKeyCreateVO extends ContentApiKeyVO implements Serializable {

    private String plainKey;

    private static final long serialVersionUID = 1L;
}
