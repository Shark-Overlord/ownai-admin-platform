package com.yupi.springbootinit.model.vo.videobackground;

import java.io.Serializable;
import lombok.Data;

@Data
public class VideoBackgroundResourceVO implements Serializable {
    private Long id;
    private String title;
    private String promptContent;
    private String downloadUrl;
    private static final long serialVersionUID = 1L;
}
