package com.yupi.springbootinit.model.dto.announcement;

import java.io.Serializable;
import lombok.Data;

@Data
public class AnnouncementReadRequest implements Serializable {

    private Long id;

    private static final long serialVersionUID = 1L;
}
