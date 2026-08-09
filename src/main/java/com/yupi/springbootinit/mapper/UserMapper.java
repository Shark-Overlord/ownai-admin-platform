package com.yupi.springbootinit.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yupi.springbootinit.model.entity.User;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.Date;

/**
 * 用户数据库操作
 *
 * @author <a href="https://github.com/liyupi">程序员鱼皮</a>
 * @from <a href="https://yupi.icu">编程导航知识星球</a>
 */
public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT * FROM user WHERE id = #{id} AND isDelete = 0 LIMIT 1 FOR UPDATE")
    User selectByIdForUpdate(@Param("id") Long id);

    @Update("UPDATE user SET memberLevel = #{memberLevel}, memberPlanType = #{memberPlanType}, "
            + "memberExpireTime = #{memberExpireTime}, updateTime = NOW() "
            + "WHERE id = #{id} AND isDelete = 0")
    int updateMembership(@Param("id") Long id,
            @Param("memberLevel") String memberLevel,
            @Param("memberPlanType") String memberPlanType,
            @Param("memberExpireTime") Date memberExpireTime);
}


