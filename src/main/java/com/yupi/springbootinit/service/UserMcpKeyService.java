package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.model.entity.UserMcpKey;
import com.yupi.springbootinit.model.vo.mcp.McpKeyCreateVO;
import com.yupi.springbootinit.model.vo.mcp.McpKeyVO;
import java.util.List;

/**
 * 用户 MCP API Key 管理服务
 */
public interface UserMcpKeyService extends IService<UserMcpKey> {

    /**
     * 为付费会员生成 MCP API Key
     *
     * @param keyName  Key 名称
     * @param loginUser 当前登录用户（必须是有效会员）
     * @return 创建结果（含明文 Key，仅返回一次）
     */
    McpKeyCreateVO generateKey(String keyName, User loginUser);

    /**
     * 吊销指定 Key
     */
    boolean revokeKey(Long keyId, User loginUser);

    /**
     * 列出当前用户的所有 MCP Key
     */
    List<McpKeyVO> listMyKeys(User loginUser);

    /**
     * 判断用户是否具有使用 MCP 的会员资格（月度、年度、永久或管理员）
     */
    boolean isEligibleMember(User user);

    /**
     * 校验 MCP API Key 并返回关联的 User 对象。
     * 同时实时校验用户会员有效性。
     *
     * @param plainKey 明文 Key
     * @param clientIp 客户端 IP（可为 null）
     * @return 关联的 User 对象；校验失败返回 null
     */
    User validateKey(String plainKey, String clientIp);
}
