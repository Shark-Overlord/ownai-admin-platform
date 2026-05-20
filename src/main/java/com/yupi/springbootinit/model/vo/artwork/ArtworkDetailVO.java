package com.yupi.springbootinit.model.vo.artwork;

import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class ArtworkDetailVO extends ArtworkVO implements Serializable {

    private String description;

    private String promptContent;

    private String accessReason;

    private static final long serialVersionUID = 1L;
}
