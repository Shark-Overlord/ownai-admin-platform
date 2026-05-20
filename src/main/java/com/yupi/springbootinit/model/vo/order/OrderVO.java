package com.yupi.springbootinit.model.vo.order;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import lombok.Data;

@Data
public class OrderVO implements Serializable {

    private Long id;

    private String orderNo;

    private Long artworkId;

    private String artworkTitle;

    private String artworkCoverUrl;

    private String orderType;

    private String orderStatus;

    private BigDecimal orderAmount;

    private Integer pointsAmount;

    private String paymentChannel;

    private Date payTime;

    private Date finishTime;

    private Date createTime;

    private static final long serialVersionUID = 1L;
}
