package com.yupi.springbootinit.mcp;

import com.yupi.springbootinit.model.entity.User;
import java.util.concurrent.atomic.AtomicBoolean;
import reactor.core.scheduler.Schedulers;

/**
 * MCP 请求用户上下文。
 * McpAuthFilter 在鉴权通过后将 User 对象放入 ThreadLocal，
 * 并通过 Reactor Scheduler Hook 自动跨 boundedElastic 异步工作线程透传，
 * 确保 Spring AI SyncToolSpecification 在任意工作线程均可读取当前认证用户。
 */
public final class McpUserContext {

    private static final String REACTOR_HOOK_KEY = "ownaiMcpUserContext";
    private static final AtomicBoolean HOOK_INSTALLED = new AtomicBoolean(false);
    private static final ThreadLocal<User> CURRENT = new ThreadLocal<>();

    static {
        installReactorHook();
    }

    private McpUserContext() {
    }

    /**
     * 注册幂等的 Reactor 线程调度钩子，解决 McpSyncServer 默认切换至
     * Schedulers.boundedElastic() 导致普通 ThreadLocal 丢失的问题。
     */
    public static void installReactorHook() {
        if (HOOK_INSTALLED.compareAndSet(false, true)) {
            Schedulers.onScheduleHook(REACTOR_HOOK_KEY, runnable -> {
                User captured = CURRENT.get();
                if (captured == null) {
                    return runnable;
                }
                return () -> {
                    User previous = CURRENT.get();
                    CURRENT.set(captured);
                    try {
                        runnable.run();
                    } finally {
                        if (previous != null) {
                            CURRENT.set(previous);
                        } else {
                            CURRENT.remove();
                        }
                    }
                };
            });
        }
    }

    public static void set(User user) {
        if (user == null) {
            CURRENT.remove();
        } else {
            CURRENT.set(user);
        }
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
