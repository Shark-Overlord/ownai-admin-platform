package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.MemberOrder;
import java.util.Date;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface MemberOrderMapper extends BaseMapper<MemberOrder> {

    @Select("SELECT * FROM member_order WHERE orderNo = #{orderNo} LIMIT 1 FOR UPDATE")
    MemberOrder selectByOrderNoForUpdate(@Param("orderNo") String orderNo);

    @Select("SELECT * FROM member_order WHERE userId = #{userId} AND paymentRequestId = #{paymentRequestId} "
            + "LIMIT 1 FOR UPDATE")
    MemberOrder selectByPaymentRequestIdForUpdate(@Param("userId") Long userId,
            @Param("paymentRequestId") String paymentRequestId);

    @Select("SELECT * FROM member_order WHERE userId = #{userId} AND paymentChannel = #{paymentChannel} "
            + "AND orderStatus = #{orderStatus} AND createTime >= #{createdAfter} "
            + "ORDER BY createTime DESC LIMIT 1 FOR UPDATE")
    MemberOrder selectActivePendingByUserForUpdate(@Param("userId") Long userId,
            @Param("paymentChannel") String paymentChannel,
            @Param("orderStatus") String orderStatus,
            @Param("createdAfter") Date createdAfter);

}
