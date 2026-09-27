package com.yupi.springbootinit.model.dto.traffictag;

import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class TrafficTagUpdateRequest extends TrafficTagAddRequest {

    private Long id;

    private static final long serialVersionUID = 1L;
}
