package com.yupi.springbootinit.model.dto.category;

import com.yupi.springbootinit.common.PageRequest;
import java.io.Serializable;
import lombok.Data;
import lombok.EqualsAndHashCode;

@EqualsAndHashCode(callSuper = true)
@Data
public class CategoryQueryRequest extends PageRequest implements Serializable {

    private String name;

    private static final long serialVersionUID = 1L;
}
