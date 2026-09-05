package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.mapper.AnnouncementMapper;
import com.yupi.springbootinit.mapper.AnnouncementPopupDismissalMapper;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementQueryRequest;
import com.yupi.springbootinit.model.entity.Announcement;
import com.yupi.springbootinit.model.vo.announcement.PublicNewsVO;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import org.springframework.test.util.ReflectionTestUtils;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Execute the application's actual SQL predicates against isolated fixtures, never production users. */
class NewsServiceTest {
    private static final long LARGE_ID = 9007199254740993L;
    private final NewsService service = new NewsService();
    private Connection connection;
    private JdbcTemplate jdbc;
    private NamedParameterJdbcTemplate named;
    private AnnouncementMapper mapper;
    private AnnouncementPopupDismissalMapper dismissals;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setup() throws Exception {
        connection = DriverManager.getConnection("jdbc:sqlite::memory:");
        SingleConnectionDataSource ds = new SingleConnectionDataSource(connection, true);
        jdbc = new JdbcTemplate(ds); named = new NamedParameterJdbcTemplate(ds);
        jdbc.execute("CREATE TABLE announcement (id INTEGER PRIMARY KEY, title TEXT, content TEXT, summary TEXT, "
                + "publicVisible INTEGER, popupEnabled INTEGER, status TEXT, isDelete INTEGER, "
                + "priority INTEGER, publishTime INTEGER, expireTime INTEGER)");
        jdbc.execute("CREATE TABLE announcement_popup_dismissal (announcementId INTEGER, userId INTEGER, "
                + "UNIQUE(announcementId,userId))");
        long now = System.currentTimeMillis();
        insert(LARGE_ID, 1, 1, "published", 0, 20, now - 1000, null);
        insert(2, 1, 1, "published", 0, 10, now - 1000, now + 3600000);
        insert(3, 0, 1, "published", 0, 99, now - 1000, null);
        insert(4, 1, 1, "draft", 0, 99, now - 1000, null);
        insert(5, 1, 1, "published", 0, 99, now - 1000, now - 1000);
        insert(6, 1, 1, "published", 0, 99, now + 3600000, null);
        insert(7, 1, 1, "published", 1, 99, now - 1000, null);
        insert(8, 1, 1, "offline", 0, 99, now - 1000, null);
        insert(9, 1, 0, "published", 0, 30, null, null);
        mapper = mock(AnnouncementMapper.class);
        dismissals = mock(AnnouncementPopupDismissalMapper.class);
        ReflectionTestUtils.setField(service, "announcementMapper", mapper);
        ReflectionTestUtils.setField(service, "dismissalMapper", dismissals);
        when(mapper.selectOne(any())).thenAnswer(inv -> {
            List<Announcement> values = rows(inv.getArgument(0));
            return values.isEmpty() ? null : values.get(0);
        });
        when(mapper.selectList(any())).thenAnswer(inv -> rows(inv.getArgument(0)));
        when(mapper.selectPage(any(Page.class), any())).thenAnswer(inv -> {
            Page<Announcement> page = inv.getArgument(0);
            List<Announcement> values = rows(inv.getArgument(1));
            int start = Math.min(values.size(), (int)((page.getCurrent() - 1) * page.getSize()));
            page.setTotal(values.size());
            page.setRecords(values.subList(start, Math.min(values.size(), start + (int)page.getSize())));
            return page;
        });
        // SQLite equivalent of the mapper's MySQL unique-key upsert.
        when(dismissals.dismissOnce(anyLong(), anyLong(), anyLong())).thenAnswer(inv ->
                jdbc.update("INSERT INTO announcement_popup_dismissal VALUES (?,?) "
                        + "ON CONFLICT(announcementId,userId) DO NOTHING", inv.<Long>getArgument(1), inv.<Long>getArgument(2)));
    }

    @AfterEach
    void close() throws Exception { connection.close(); }

    @Test
    void publicPaginationExcludesPrivateDraftExpiredFutureOfflineAndDeletedNews() {
        AnnouncementQueryRequest request = new AnnouncementQueryRequest();
        request.setPageSize(2);
        Page<PublicNewsVO> first = service.list(request);
        assertEquals(3, first.getTotal());
        assertEquals("9", first.getRecords().get(0).getId());
        assertEquals(String.valueOf(LARGE_ID), first.getRecords().get(1).getId());
        assertNull(first.getRecords().get(0).getContent());
        request.setCurrent(2);
        assertEquals("2", service.list(request).getRecords().get(0).getId());
        request.setCurrent(3);
        assertTrue(service.list(request).getRecords().isEmpty());
    }

    @Test
    void detailHasExactStringIdAndNoAdministrativeFields() throws Exception {
        PublicNewsVO detail = service.get(LARGE_ID);
        String json = new ObjectMapper().writeValueAsString(detail);
        assertTrue(json.contains("\"id\":\"9007199254740993\""));
        assertTrue(json.contains("body"));
        assertFalse(json.contains("createUserId"));
        assertFalse(json.contains("publicVisible"));
        assertFalse(json.contains("status"));
        for (long id : Arrays.asList(3L, 4L, 5L, 6L, 7L, 8L, 999L)) {
            assertThrows(BusinessException.class, () -> service.get(id));
        }
    }

    @Test
    void popupHonorsPriorityGuestExclusionsAndPerAccountDismissals() {
        assertEquals(String.valueOf(LARGE_ID), service.popup(null, null).getId());
        assertEquals("2", service.popup(Collections.singletonList(LARGE_ID), null).getId());
        assertNull(service.popup(Arrays.asList(LARGE_ID, 2L), null));
        service.dismiss(Collections.singletonList(LARGE_ID), 77L);
        assertEquals("2", service.popup(null, 77L).getId());
        assertEquals(String.valueOf(LARGE_ID), service.popup(null, 88L).getId());
    }

    @Test
    void guestMergeIsIdempotentSurvivesOfflineAndDoesNotMarkRead() {
        service.dismiss(Arrays.asList(LARGE_ID, LARGE_ID, 3L, 999L), 77L);
        service.dismiss(Collections.singletonList(LARGE_ID), 77L);
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM announcement_popup_dismissal", Integer.class));
        jdbc.update("UPDATE announcement SET status='offline' WHERE id=?", LARGE_ID);
        service.dismiss(Collections.singletonList(LARGE_ID), 77L);
        jdbc.update("UPDATE announcement SET status='published', content='edited' WHERE id=?", LARGE_ID);
        assertEquals("2", service.popup(null, 77L).getId());
        // No dependency on announcement_read: popup dismissal is a separate persisted event.
    }

    @Test
    void invalidRequestsAreRejectedBeforeDatabaseQueries() {
        assertThrows(BusinessException.class, () -> service.get(0L));
        assertThrows(BusinessException.class, () -> service.dismiss(Arrays.asList(1L), null));
        assertThrows(BusinessException.class, () -> service.popup(Arrays.asList(-1L), null));
        assertThrows(BusinessException.class, () -> service.popup(Collections.nCopies(501, 1L), null));
        AnnouncementQueryRequest query = new AnnouncementQueryRequest(); query.setPageSize(1000);
        assertThrows(BusinessException.class, () -> service.list(query));
    }

    private void insert(long id, int visible, int popup, String status, int deleted, int priority, Long publish, Long expire) {
        jdbc.update("INSERT INTO announcement VALUES (?,?,?,?,?,?,?,?,?,?,?)", id, "News " + id, "body", "summary",
                visible, popup, status, deleted, priority, publish, expire);
    }

    private List<Announcement> rows(QueryWrapper<Announcement> query) {
        String predicate = query.getSqlSegment().replaceAll("#\\{ew\\.paramNameValuePairs\\.(\\w+)\\}", ":$1");
        Map<String,Object> values = new HashMap<>();
        query.getParamNameValuePairs().forEach((k,v) -> values.put(k, v instanceof Date ? ((Date)v).getTime() : v));
        return named.query("SELECT * FROM announcement WHERE " + predicate, values, (rs, row) -> {
            Announcement item = new Announcement();
            item.setId(rs.getLong("id")); item.setTitle(rs.getString("title"));
            item.setContent(rs.getString("content")); item.setSummary(rs.getString("summary"));
            item.setPublicVisible(rs.getBoolean("publicVisible")); item.setPopupEnabled(rs.getBoolean("popupEnabled"));
            return item;
        });
    }
}
