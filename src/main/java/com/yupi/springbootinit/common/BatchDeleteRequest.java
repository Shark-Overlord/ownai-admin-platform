package com.yupi.springbootinit.common;

import java.io.Serializable;
import java.util.List;
import lombok.Data;

/**
 * 批量删除请求
 *
 * @author <a href="https://github.com/liyupi">程序员鱼皮</a>
 * @from <a href="https://yupi.icu">编程导航知识星球</a>
 */
@Data
public class BatchDeleteRequest implements Serializable {

    /**
     * id 列表
     */
    private List<Long> ids;

    private static final long serialVersionUID = 1L;
}
