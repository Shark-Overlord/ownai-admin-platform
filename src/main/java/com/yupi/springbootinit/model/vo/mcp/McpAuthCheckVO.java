package com.yupi.springbootinit.model.vo.mcp;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.io.Serializable;
import java.util.Date;
import lombok.Data;

/**
 * MCP 网页授权前置检查 VO
 */
@Data
public class McpAuthCheckVO implements Serializable {

    /**
     * 是否已登录
     */
    private Boolean isLogin;

    /**
     * 用户ID
     */
    private Long userId;

    /**
     * 账号
     */
    private String userAccount;

    /**
     * 用户名
     */
    private String userName;

    /**
     * 用户头像
     */
    private String userAvatar;

    /**
     * 会员等级：normal / member
     */
    private String memberLevel;

    /**
     * 会员套餐类型：month / year / lifetime
     */
    private String memberPlanType;

    /**
     * 会员到期时间
     */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Shanghai")
    private Date memberExpireTime;

    /**
     * 是否具备使用 MCP 的会员资格（付费会员或管理员）
     */
    private Boolean isEligibleMember;

    /**
     * 是否为永久会员
     */
    private Boolean isLifetime;

    /**
     * 会员剩余天数（永久会员为 null）
     */
    private Integer remainingDays;

    private static final long serialVersionUID = 1L;
}
