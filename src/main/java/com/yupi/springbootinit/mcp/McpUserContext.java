package com.yupi.springbootinit.mcp;

import com.yupi.springbootinit.model.entity.User;

/**
 * MCP 请求用户上下文。
 * McpAuthFilter 在鉴权通过后将 User 对象放入 ThreadLocal，
 * MCP Tool 方法从此处获取当前用户身份。
 */
public final class McpUserContext {

    private static final ThreadLocal<User> CURRENT = new ThreadLocal<>();

    private McpUserContext() {
    }

    public static void set(User user) {
        CURRENT.set(user);
    }

    public static User get() {
        return CURRENT.get();
    }

    public static Long getUserId() {
        User u = get();
        return u == null ? null : u.getId();
    }

    public static void clear() {
        CURRENT.remove();
    }
}
