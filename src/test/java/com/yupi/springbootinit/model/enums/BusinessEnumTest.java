package com.yupi.springbootinit.model.enums;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class BusinessEnumTest {

    @Test
    void memberLevelEnumShouldMapCorrectly() {
        Assertions.assertEquals(MemberLevelEnum.PLUS, MemberLevelEnum.getEnumByValue("plus"));
        Assertions.assertNull(MemberLevelEnum.getEnumByValue("vip"));
        Assertions.assertTrue(MemberLevelEnum.PRO.canAccessMemberContent());
        Assertions.assertFalse(MemberLevelEnum.NORMAL.canAccessMemberContent());
    }

    @Test
    void orderAndFileEnumsShouldMapCorrectly() {
        Assertions.assertEquals(OrderStatusEnum.PENDING, OrderStatusEnum.getEnumByValue("pending"));
        Assertions.assertEquals(OrderTypeEnum.CASH, OrderTypeEnum.getEnumByValue("cash"));
        Assertions.assertEquals(FileUploadBizEnum.ARTWORK_VIDEO, FileUploadBizEnum.getEnumByValue("artwork_video"));
        Assertions.assertNull(OrderTypeEnum.getEnumByValue("crypto"));
    }

    @Test
    void memberOrderTypeAndPointTypeEnumsShouldMapCorrectly() {
        Assertions.assertEquals(MemberOrderTypeEnum.ADMIN_GRANT, MemberOrderTypeEnum.getEnumByValue("admin_grant"));
        Assertions.assertEquals(PointChangeTypeEnum.CHECK_IN_REWARD,
                PointChangeTypeEnum.getEnumByValue("check_in_reward"));
        Assertions.assertNull(PointChangeTypeEnum.getEnumByValue("unknown"));
    }
}
