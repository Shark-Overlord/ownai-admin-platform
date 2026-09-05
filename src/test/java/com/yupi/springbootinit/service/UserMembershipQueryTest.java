package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.yupi.springbootinit.model.dto.user.UserQueryRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.impl.UserServiceImpl;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Arrays;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

/** Execute the real query predicate against isolated fixtures without application services or production data. */
class UserMembershipQueryTest {

    private Connection connection;
    private JdbcTemplate jdbc;
    private NamedParameterJdbcTemplate namedJdbc;
    private final UserServiceImpl service = new UserServiceImpl();

    @BeforeEach
    void setUp() throws Exception {
        connection = DriverManager.getConnection("jdbc:sqlite::memory:");
        SingleConnectionDataSource dataSource = new SingleConnectionDataSource(connection, true);
        jdbc = new JdbcTemplate(dataSource);
        namedJdbc = new NamedParameterJdbcTemplate(dataSource);
        jdbc.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, memberLevel TEXT, memberPlanType TEXT, "
                + "memberExpireTime INTEGER, userAccount TEXT, userRole TEXT)");
    }

    @AfterEach
    void tearDown() throws Exception {
        connection.close();
    }

    @Test
    void activeMembersExcludeExpiredBoundaryAndMalformedMemberships() {
        QueryWrapper<User> query = service.getQueryWrapper(activeRequest());
        seed(query);
        assertEquals(Arrays.asList(1L, 2L, 3L, 4L), ids(query, ""));
    }

    @ParameterizedTest
    @CsvSource({"month,1", "year,2", "lifetime,3"})
    void planAndAccountAndRoleFiltersAlsoApplyToLifetimeBranch(String plan, long expectedId) {
        UserQueryRequest request = activeRequest();
        request.setMemberLevel("member");
        request.setMemberPlanType(plan);
        request.setUserAccount("match");
        request.setUserRole("user");
        QueryWrapper<User> query = service.getQueryWrapper(request);
        seed(query);
        assertEquals(Collections.singletonList(expectedId), ids(query, ""));
    }

    @Test
    void paginationUsesFilteredTotalAcrossPagesAndAllowsEmptyResults() {
        QueryWrapper<User> query = service.getQueryWrapper(activeRequest());
        seed(query);
        assertEquals(4L, namedJdbc.queryForObject("SELECT COUNT(*) FROM users WHERE " + where(query),
                parameters(query), Long.class));
        assertEquals(Arrays.asList(1L, 2L), ids(query, " LIMIT 2 OFFSET 0"));
        assertEquals(Arrays.asList(3L, 4L), ids(query, " LIMIT 2 OFFSET 2"));
        assertEquals(Collections.emptyList(), ids(query, " LIMIT 2 OFFSET 4"));

        UserQueryRequest emptyRequest = activeRequest();
        emptyRequest.setUserAccount("missing-account");
        QueryWrapper<User> empty = service.getQueryWrapper(emptyRequest);
        assertEquals(Collections.emptyList(), ids(empty, ""));
        assertEquals(0L, namedJdbc.queryForObject("SELECT COUNT(*) FROM users WHERE " + where(empty),
                parameters(empty), Long.class));
    }

    @Test
    void omittedOrFalseFlagPreservesExistingQueriesIncludingExpiredMembers() {
        seed(service.getQueryWrapper(activeRequest()));
        for (Boolean flag : Arrays.asList(null, false)) {
            UserQueryRequest request = new UserQueryRequest();
            request.setActiveMemberOnly(flag);
            QueryWrapper<User> all = service.getQueryWrapper(request);
            assertEquals(13, ids(all, "").size());
            assertFalse(where(all).contains("memberExpireTime"));

            request.setMemberPlanType("month");
            assertEquals(Arrays.asList(1L, 5L, 6L, 7L, 11L),
                    ids(service.getQueryWrapper(request), ""));
            request.setMemberPlanType(null);
            request.setMemberLevel("normal");
            assertEquals(Arrays.asList(11L, 12L), ids(service.getQueryWrapper(request), ""));
        }
    }

    private UserQueryRequest activeRequest() {
        UserQueryRequest request = new UserQueryRequest();
        request.setActiveMemberOnly(true);
        return request;
    }

    private void seed(QueryWrapper<User> query) {
        // Seed exact boundary values from the captured query time; no sleeps or clock races.
        query.getSqlSegment();
        List<Date> dates = new java.util.ArrayList<>();
        query.getParamNameValuePairs().values().forEach(value -> {
            if (value instanceof Date) {
                dates.add((Date) value);
            }
        });
        assertEquals(1, dates.size());
        long now = dates.get(0).getTime();
        insert(1, "member", "month", now + 60000, "match-month", "user");
        insert(2, "member", "year", now + 60000, "match-year", "user");
        insert(3, "member", "lifetime", null, "match-lifetime", "user");
        insert(4, "member", "lifetime", null, "another-lifetime", "admin");
        insert(5, "member", "month", now - 1, "expired", "user");
        insert(6, "member", "month", now, "boundary", "user");
        insert(7, "member", "month", null, "missing-month-expiry", "user");
        insert(8, "member", "year", null, "missing-year-expiry", "user");
        insert(9, "member", "lifetime", now + 60000, "invalid-lifetime", "user");
        insert(10, "member", null, now + 60000, "missing-plan", "user");
        insert(11, "normal", "month", now + 60000, "normal-month", "user");
        insert(12, "normal", "lifetime", null, "normal-lifetime", "user");
        insert(13, "member", "year", now - 1, "expired-year", "user");
    }

    private void insert(int id, String level, String plan, Long expiry, String account, String role) {
        jdbc.update("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?)", id, level, plan, expiry, account, role);
    }

    private List<Long> ids(QueryWrapper<User> query, String pagination) {
        return namedJdbc.queryForList("SELECT id FROM users WHERE " + where(query) + " ORDER BY id" + pagination,
                parameters(query), Long.class);
    }

    private String where(QueryWrapper<User> query) {
        String sql = query.getSqlSegment();
        return sql.isEmpty() ? "1=1" : sql.replaceAll("#\\{ew\\.paramNameValuePairs\\.(\\w+)\\}", ":$1");
    }

    private Map<String, Object> parameters(QueryWrapper<User> query) {
        Map<String, Object> values = new HashMap<>();
        query.getParamNameValuePairs().forEach((key, value) ->
                values.put(key, value instanceof Date ? ((Date) value).getTime() : value));
        return values;
    }
}
