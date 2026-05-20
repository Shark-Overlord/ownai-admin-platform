package com.yupi.springbootinit.utils;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class SqlUtilsTest {

    @Test
    void validSortFieldShouldAcceptSafeField() {
        Assertions.assertTrue(SqlUtils.validSortField("createTime"));
        Assertions.assertTrue(SqlUtils.validSortField("orderNo"));
    }

    @Test
    void validSortFieldShouldRejectUnsafeField() {
        Assertions.assertFalse(SqlUtils.validSortField("createTime desc"));
        Assertions.assertFalse(SqlUtils.validSortField("id=1"));
        Assertions.assertFalse(SqlUtils.validSortField("count(*)"));
        Assertions.assertFalse(SqlUtils.validSortField(null));
    }
}
