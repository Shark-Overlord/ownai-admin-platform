package com.yupi.springbootinit.service.community;

import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.community.CommunityRequests.Query;
import java.net.URI;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** All dynamic SQL identifiers are server-owned; all request values are bound parameters. */
@Repository
public class CommunityStore {
    private final JdbcTemplate jdbc;
    public CommunityStore(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    // Repository beans may be Spring exception-translation proxies; never access instance fields through a proxy.
    public JdbcTemplate jdbc() { return jdbc; }
    static final String VISIBLE_COMMENT = "c.hidden=0 AND c.isDelete=0 AND (c.rootId IS NULL OR EXISTS "
            + "(SELECT 1 FROM community_comment root WHERE root.id=c.rootId AND root.hidden=0 AND root.isDelete=0))";
    static final String COUNTS = "(SELECT COUNT(*) FROM community_like l WHERE l.postId=p.id) AS likeCount, "
            + "(SELECT COUNT(*) FROM community_comment c WHERE c.postId=p.id AND " + VISIBLE_COMMENT + ") AS commentCount";
    static final String PUBLIC_POST = "p.isDelete=0 AND p.status='published' AND p.publishedRevisionId IS NOT NULL";

    Map<String,Object> one(String sql, Object... args) {
        List<Map<String,Object>> rows = jdbc.queryForList(sql, args);
        if (rows.isEmpty()) throw new BusinessException(ErrorCode.NOT_FOUND_ERROR, "内容不存在或已下线");
        return rows.get(0);
    }
    Map<String,Object> post(Long id, boolean lock) {
        validId(id);
        return one("SELECT * FROM community_post WHERE id=? AND isDelete=0" + (lock ? " FOR UPDATE" : ""), id);
    }
    Map<String,Object> publicPost(Long id, boolean lock) {
        Map<String,Object> p = post(id, lock);
        if (!"published".equals(p.get("status")) || p.get("publishedRevisionId") == null)
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR, "帖子尚未发布或已下线");
        return p;
    }
    static long number(Map<String,Object> row, String key) { return ((Number) row.get(key)).longValue(); }
    static boolean flag(Object value) { return Boolean.TRUE.equals(value) || (value instanceof Number && ((Number)value).intValue()!=0); }
    static void validId(Long id) { require(id != null && id > 0, "编号不合法"); }
    static void require(boolean value, String message) { if (!value) throw new BusinessException(ErrorCode.PARAMS_ERROR, message); }
    static String text(String value, int max, boolean required, String label) {
        String s = value == null ? "" : value.trim();
        require(s.length() <= max && (!required || !s.isEmpty()), label + "为空或超过长度限制 " + max);
        return s;
    }
    static String mediaUrl(String value) {
        String s = text(value, 1000, false, "媒体地址");
        if (s.isEmpty()) return s;
        try {
            URI uri = URI.create(s);
            require("https".equalsIgnoreCase(uri.getScheme()) && uri.getHost()!=null && uri.getUserInfo()==null, "媒体须使用 HTTPS 地址");
        } catch (IllegalArgumentException e) { throw new BusinessException(ErrorCode.PARAMS_ERROR, "媒体地址不合法"); }
        return s;
    }
    static void page(Query q) {
        require(q.getCurrent()>0 && q.getCurrent()<=10000 && q.getPageSize()>0 && q.getPageSize()<=50, "分页参数不合法");
        require("latest".equals(q.getSort()) || "popular".equals(q.getSort()), "排序参数不合法");
        text(q.getKeyword(), 150, false, "关键词");
    }
    Map<String,Object> pageResult(String from, String columns, String order, List<Object> args, Query q) {
        page(q);
        Long total = jdbc.queryForObject("SELECT COUNT(*) " + from, Long.class, args.toArray());
        List<Object> paged = new ArrayList<>(args);
        paged.add(q.getPageSize()); paged.add((q.getCurrent()-1)*q.getPageSize());
        Map<String,Object> result = new LinkedHashMap<>();
        result.put("records", jdbc.queryForList("SELECT " + columns + " " + from + " ORDER BY " + order + " LIMIT ? OFFSET ?", paged.toArray()));
        result.put("total", total); result.put("current", q.getCurrent()); result.put("size", q.getPageSize());
        return result;
    }
    static void version(Map<String,Object> post, Integer expected) {
        if (expected == null || number(post,"version") != expected)
            throw new BusinessException(ErrorCode.OPERATION_ERROR, "内容已被其他操作修改，请刷新后重试");
    }
}
