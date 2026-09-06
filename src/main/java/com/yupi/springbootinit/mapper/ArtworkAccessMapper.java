package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.ArtworkAccess;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface ArtworkAccessMapper extends BaseMapper<ArtworkAccess> {
    // A legacy callback could create cash grants without payment verification. Only
    // completed points orders backed by a real debit are trusted by this feature.
    // Query orders as well as grants so previously debited orders with a missing grant work.
    @Select({"<script>",
            "SELECT DISTINCT o.artworkId FROM artwork_order o",
            "WHERE o.userId = #{userId} AND o.orderType = 'points'",
            "AND o.orderStatus = 'completed' AND o.pointsAmount &gt; 0",
            "AND o.artworkId IN",
            "<foreach collection='artworkIds' item='id' open='(' separator=',' close=')'>#{id}</foreach>",
            "AND EXISTS (SELECT 1 FROM point_record p WHERE p.userId = o.userId",
            "AND p.relatedType = 'order' AND p.relatedId = o.id",
            "AND p.changeType = 'redeem_consume' AND p.changeAmount = -o.pointsAmount)",
            "</script>"})
    List<Long> selectPermanentArtworkIds(@Param("userId") Long userId,
            @Param("artworkIds") List<Long> artworkIds);
}
