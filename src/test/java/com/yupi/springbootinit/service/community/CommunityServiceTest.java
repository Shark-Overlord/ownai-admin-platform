package com.yupi.springbootinit.service.community;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yupi.springbootinit.aop.AuthInterceptor;
import com.yupi.springbootinit.config.JsonConfig;
import com.yupi.springbootinit.controller.CommunityController;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.*;
import com.yupi.springbootinit.model.dto.community.CommunityRequests.*;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementAddRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.h2.jdbcx.JdbcDataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real SQL and transaction proxies on an isolated H2 database in MySQL mode. */
@SpringJUnitConfig(CommunityServiceTest.Config.class)
class CommunityServiceTest {
    @Configuration @EnableTransactionManagement @EnableAspectJAutoProxy(proxyTargetClass=true)
    static class Config {
        @Bean static org.springframework.dao.annotation.PersistenceExceptionTranslationPostProcessor exceptionTranslation() {
            org.springframework.dao.annotation.PersistenceExceptionTranslationPostProcessor p=new org.springframework.dao.annotation.PersistenceExceptionTranslationPostProcessor();
            p.setProxyTargetClass(true); return p;
        }
        @Bean DataSource dataSource() { JdbcDataSource ds=new JdbcDataSource(); ds.setURL("jdbc:h2:mem:community;MODE=MySQL;DATABASE_TO_UPPER=FALSE;NON_KEYWORDS=USER;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000"); return ds; }
        @Bean JdbcTemplate jdbc(DataSource ds) { return new JdbcTemplate(ds); }
        @Bean PlatformTransactionManager tx(DataSource ds) { return new DataSourceTransactionManager(ds); }
        @Bean CommunityStore store(JdbcTemplate jdbc) { return new CommunityStore(jdbc); }
        @Bean CommunityTaxonomyService taxonomy(CommunityStore db) { return new CommunityTaxonomyService(db); }
        @Bean AnnouncementService announcements() { return mock(AnnouncementService.class); }
        @Bean UserService users() { return mock(UserService.class); }
        @Bean CommunityPostService posts(CommunityStore db,CommunityTaxonomyService t,AnnouncementService a) { return new CommunityPostService(db,t,a); }
        @Bean CommunityInteractionService interactions(CommunityStore db) { return new CommunityInteractionService(db); }
        @Bean CommunityController controller(CommunityPostService p,CommunityTaxonomyService t,CommunityInteractionService i,UserService u) { return new CommunityController(p,t,i,u); }
        @Bean AuthInterceptor auth(UserService users) { AuthInterceptor a=new AuthInterceptor();ReflectionTestUtils.setField(a,"userService",users);return a; }
    }
    @Autowired JdbcTemplate jdbc;
    @Autowired CommunityStore store;
    @Autowired CommunityPostService posts;
    @Autowired CommunityTaxonomyService taxonomy;
    @Autowired CommunityInteractionService interactions;
    @Autowired CommunityController controller;
    @Autowired UserService users;
    @Autowired AnnouncementService announcements;
    private Long category,tag;
    private MockMvc mvc;
    private final ObjectMapper json=new ObjectMapper().registerModule(new JsonConfig().longToStringModule())
            .disable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    @BeforeEach void setup() throws Exception {
        jdbc.execute("DROP ALL OBJECTS");
        String schema=new String(Files.readAllBytes(Paths.get("sql/community.sql")),StandardCharsets.UTF_8);
        schema=schema.replaceAll("(?m)^--.*$","");
        for(String sql:schema.split(";")) if(!sql.trim().isEmpty() && !sql.trim().startsWith("ALTER TABLE")) jdbc.execute(sql);
        jdbc.execute("CREATE TABLE user(id BIGINT PRIMARY KEY,userName VARCHAR(50),isDelete INT DEFAULT 0)");
        jdbc.execute("CREATE TABLE announcement(id BIGINT PRIMARY KEY,title VARCHAR(150),summary VARCHAR(300),status VARCHAR(20),popupEnabled INT,targetType VARCHAR(30),targetId BIGINT)");
        reset(users,announcements);
        when(users.getLoginUser(any())).thenAnswer(inv -> {
            javax.servlet.http.HttpServletRequest r=inv.getArgument(0);String role=r.getHeader("X-Test-Role");
            if(role==null) throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
            User u=new User();u.setId("admin".equals(role)?1L:2L);u.setUserRole(role);return u;
        });
        when(users.getLoginUserPermitNull(any())).thenAnswer(inv -> {
            try { return users.getLoginUser(inv.getArgument(0)); } catch(BusinessException e) { return null; }
        });
        when(announcements.addAnnouncement(any(),any())).thenAnswer(inv -> {
            AnnouncementAddRequest r=inv.getArgument(0); long id=9007199254740993L;
            jdbc.update("INSERT INTO announcement(id,title,summary,status,popupEnabled) VALUES (?,?,?,?,?)",id,r.getTitle(),r.getSummary(),r.getStatus(),r.getPopupEnabled());return id;
        });
        category=term("category","更新");tag=term("tag","插件");
        mvc=MockMvcBuilders.standaloneSetup(controller).setControllerAdvice(new GlobalExceptionHandler())
                .setMessageConverters(new MappingJackson2HttpMessageConverter(json)).build();
    }
    private Long term(String kind,String name) { Taxonomy t=new Taxonomy();t.setName(name);return taxonomy.save(kind,t); }
    private SavePost draft(String title) { SavePost r=new SavePost();r.setTitle(title);r.setCategoryId(category);r.setTagIds(Arrays.asList(tag));r.setMarkdown("# 标题\n\n原文  \n\n```video\nhttps://example.test/demo.mp4\n```\n");return r; }
    private Long create(String title) { return ((Number)posts.save(draft(title),1L).get("id")).longValue(); }
    private PostAction action(Long id) { PostAction r=new PostAction();r.setId(id);r.setVersion(((Number)posts.getAdmin(id).get("version")).intValue());return r; }
    private void publish(Long id) { posts.action(action(id),"publish"); }
    private Query query(Long postId) { Query q=new Query();q.setPostId(postId);return q; }
    @SuppressWarnings("unchecked") private List<Map<String,Object>> rows(Map<String,Object> page) { return (List<Map<String,Object>>)page.get("records"); }
    private Comment comment(Long id,String content,Long parent) { Comment r=new Comment();r.setPostId(id);r.setContent(content);r.setReplyToId(parent);r.setRequestKey(UUID.randomUUID().toString());return r; }
    private void hidden(Long id,boolean hidden) { Moderate r=new Moderate();r.setId(id);r.setHidden(hidden);interactions.moderate(r); }
    private void like(Long post,Long user,boolean liked) { Like r=new Like();r.setPostId(post);r.setLiked(liked);interactions.like(r,user); }

    @Test void repositoryProxyAndTaxonomyEndpointsMatchProduction() throws Exception {
        assertTrue(org.springframework.aop.support.AopUtils.isAopProxy(store));
        assertEquals(1,taxonomy.list("category",false).size());
        assertEquals(1,taxonomy.list("tag",false).size());
        mvc.perform(get("/community/taxonomy/category")).andExpect(jsonPath("$.code").value(0));
        mvc.perform(get("/community/taxonomy/tag")).andExpect(jsonPath("$.data[0].id").value(tag.toString()));
    }

    @Test void draftAndPublishedTaxonomyAreIsolatedAndFirstPublicationIsStable() {
        Long id=create("旧标题");assertThrows(BusinessException.class,()->posts.getPublic(id,null)); publish(id);
        Object first=posts.getPublic(id,null).get("firstPublishedAt");
        Long newCategory=term("category","新分类"),newTag=term("tag","新标签");
        SavePost r=draft("新标题");r.setId(id);r.setVersion(action(id).getVersion());r.setCategoryId(newCategory);r.setTagIds(Arrays.asList(newTag));r.setMarkdown("  原文\n\n");posts.save(r,1L);
        Query q=new Query();q.setCategoryId(category);q.setTagId(tag);assertEquals(1,rows(posts.list(q,false)).size());
        assertEquals("旧标题",posts.getPublic(id,null).get("title"));
        q.setCategoryId(newCategory);assertEquals(0,rows(posts.list(q,false)).size());
        publish(id);Map<String,Object> live=posts.getPublic(id,null);assertEquals("新标题",live.get("title"));assertEquals("  原文\n\n",live.get("markdown"));assertEquals(first,live.get("firstPublishedAt"));
        assertFalse(live.containsKey("authorId"));assertFalse(live.containsKey("draftRevisionId"));
        posts.action(action(id),"offline");assertThrows(BusinessException.class,()->posts.getPublic(id,null));publish(id);assertEquals(first,posts.getPublic(id,null).get("firstPublishedAt"));
    }
    @Test void taxonomyValidationStaleWritesAndFailedSavesRollback() {
        Long id=create("测试");PostAction old=action(id);publish(id);assertThrows(BusinessException.class,()->posts.action(old,"offline"));
        Taxonomy t=new Taxonomy();t.setId(tag);t.setName("插件");t.setEnabled(false);taxonomy.save("tag",t);
        Long before=jdbc.queryForObject("SELECT COUNT(*) FROM community_post",Long.class);
        assertThrows(BusinessException.class,()->create("新帖子不可关联停用标签"));assertEquals(before,jdbc.queryForObject("SELECT COUNT(*) FROM community_post",Long.class));
        SavePost r=draft("已有标签可保留");r.setId(id);r.setVersion(action(id).getVersion());posts.save(r,1L);
        assertThrows(BusinessException.class,()->taxonomy.delete("tag",tag));assertThrows(BusinessException.class,()->taxonomy.delete("category",category));
        SavePost incomplete=draft("无分类");incomplete.setCategoryId(null);incomplete.setTagIds(Collections.emptyList());Long incompleteId=((Number)posts.save(incomplete,1L).get("id")).longValue();assertThrows(BusinessException.class,()->publish(incompleteId));
        assertThrows(BusinessException.class,()->taxonomy.list("tag;DROP TABLE user",true));
    }
    @Test void latestAndPopularUseVisibleRepliesAndCurrentLikes() throws Exception {
        Long a=create("A");publish(a);Thread.sleep(5);Long b=create("B");publish(b);
        Query q=new Query();assertEquals(b,rows(posts.list(q,false)).get(0).get("id"));
        Long root=Long.valueOf(interactions.comment(comment(a,"主留言",null),2L,false));
        Long reply=Long.valueOf(interactions.comment(comment(a,"回复",root),3L,false));
        like(a,2L,true);like(a,2L,true);assertEquals(1L,posts.getPublic(a,null).get("likeCount"));
        q.setSort("popular");assertEquals(a,rows(posts.list(q,false)).get(0).get("id"));assertEquals(3L,posts.getPublic(a,null).get("popularity"));
        hidden(reply,true);assertEquals(1L,posts.getPublic(a,null).get("commentCount"));hidden(root,true);assertEquals(0L,posts.getPublic(a,null).get("commentCount"));
        assertEquals(0,rows(interactions.comments(query(a),false)).size());Query replies=query(a);replies.setRootId(root);assertEquals(0,rows(interactions.comments(replies,false)).size());
        hidden(root,false);assertEquals(1L,posts.getPublic(a,null).get("commentCount"));hidden(reply,false);assertEquals(2L,posts.getPublic(a,null).get("commentCount"));
        like(a,2L,false);like(a,2L,false);assertEquals(0L,posts.getPublic(a,null).get("likeCount"));
        hidden(root,true);assertEquals(b,rows(posts.list(q,false)).get(0).get("id"));
    }
    @Test void repliesRetryLimitsAndReports() {
        Long a=create("A");publish(a);Long b=create("B");publish(b);
        Comment r=comment(a,"hello <script>alert(1)</script>",null);Long root=Long.valueOf(interactions.comment(r,2L,false));
        assertEquals(root.toString(),interactions.comment(r,2L,false));
        assertEquals(root.toString(),interactions.comment(comment(a,r.getContent(),null),2L,false));
        assertThrows(BusinessException.class,()->interactions.comment(comment(b,"跨帖回复",root),2L,false));
        hidden(root,true);assertThrows(BusinessException.class,()->interactions.comment(comment(a,"隐藏回复",root),2L,false));hidden(root,false);
        for(int i=0;i<4;i++) interactions.comment(comment(a,"内容"+i,null),2L,false);
        assertThrows(BusinessException.class,()->interactions.comment(comment(a,"第六条",null),2L,false));
        assertEquals(root.toString(),interactions.comment(r,2L,false));
        Report report=new Report();report.setCommentId(root);report.setReason("广告");String reportId=interactions.report(report,3L);assertEquals(reportId,interactions.report(report,3L));
        ResolveReport resolve=new ResolveReport();resolve.setId(Long.valueOf(reportId));resolve.setResolution("已核实并隐藏");hidden(root,true);interactions.resolve(resolve,1L);
        assertEquals("resolved",rows(interactions.reports(new Query())).get(0).get("status"));
        assertEquals(5L,jdbc.queryForObject("SELECT COUNT(*) FROM community_comment",Long.class));
    }
    @Test void closingCommentsAndOfflineOrDeletedPostsBlockInteractions() {
        Long id=create("测试");publish(id);interactions.comment(comment(id,"历史留言",null),2L,false);
        SavePost r=draft("测试");r.setId(id);r.setVersion(action(id).getVersion());r.setCommentsEnabled(false);posts.save(r,1L);publish(id);
        assertEquals(1,rows(interactions.comments(query(id),false)).size());assertThrows(BusinessException.class,()->interactions.comment(comment(id,"新留言",null),3L,false));
        posts.action(action(id),"offline");assertThrows(BusinessException.class,()->interactions.comments(query(id),false));assertThrows(BusinessException.class,()->like(id,3L,true));
        posts.action(action(id),"delete");assertThrows(BusinessException.class,()->posts.getPublic(id,null));assertEquals(0,rows(posts.list(new Query(),false)).size());
    }
    @Test void concurrentLikesAndCommentRetriesAreIdempotent() throws Exception {
        Long id=create("并发");publish(id);Comment r=comment(id,"重试",null);
        ExecutorService executor=Executors.newFixedThreadPool(4);
        try {
            List<Callable<String>> jobs=new ArrayList<>();for(int i=0;i<8;i++) jobs.add(()->{like(id,2L,true);return interactions.comment(r,2L,false);});
            Set<String> results=new HashSet<>();for(Future<String> f:executor.invokeAll(jobs))results.add(f.get());
            assertEquals(1,results.size());assertEquals(1L,posts.getPublic(id,null).get("likeCount"));assertEquals(1L,posts.getPublic(id,null).get("commentCount"));
        } finally {executor.shutdownNow();}
    }
    @Test void announcementIsADraftSnapshotWithStringSafeAssociation() {
        Long id=create("公告来源");publish(id);User admin=new User();admin.setId(1L);
        String announcementId=posts.announcement(action(id),admin);Map<String,Object> announcement=jdbc.queryForMap("SELECT * FROM announcement WHERE id=?",announcementId);
        assertEquals("draft",announcement.get("status"));assertEquals(0,announcement.get("popupEnabled"));assertEquals("community_post",announcement.get("targetType"));assertEquals(id,announcement.get("targetId"));
        SavePost r=draft("修改帖子");r.setId(id);r.setVersion(action(id).getVersion());posts.save(r,1L);publish(id);
        assertEquals("公告来源",jdbc.queryForObject("SELECT title FROM announcement WHERE id=?",String.class,announcementId));
    }
    @Test void httpRolesVisibilityAndIds() throws Exception {
        Long id=create("权限");
        mvc.perform(get("/community/post/get").param("id",id.toString())).andExpect(jsonPath("$.code").value(40400));publish(id);
        mvc.perform(get("/community/post/get").param("id",id.toString())).andExpect(jsonPath("$.data.id").value(id.toString())).andExpect(jsonPath("$.data.authorId").doesNotExist());
        for(String role:Arrays.asList("user","admin")) mvc.perform(get("/community/post/get").param("id",id.toString()).header("X-Test-Role",role)).andExpect(jsonPath("$.code").value(0));
        mvc.perform(post("/community/admin/post/list/page").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(jsonPath("$.code").value(40100));
        mvc.perform(post("/community/admin/post/list/page").header("X-Test-Role","user").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(jsonPath("$.code").value(40101));
        mvc.perform(post("/community/admin/post/list/page").header("X-Test-Role","admin").contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(jsonPath("$.code").value(0));
        String likeBody="{\"postId\":\""+id+"\",\"liked\":true,\"userId\":\"999\"}";
        mvc.perform(post("/community/like").contentType(MediaType.APPLICATION_JSON).content(likeBody)).andExpect(jsonPath("$.code").value(40100));
        mvc.perform(post("/community/like").header("X-Test-Role","ban").contentType(MediaType.APPLICATION_JSON).content(likeBody)).andExpect(jsonPath("$.code").value(40101));
        mvc.perform(post("/community/like").header("X-Test-Role","user").contentType(MediaType.APPLICATION_JSON).content(likeBody)).andExpect(jsonPath("$.code").value(0));
        assertEquals(2L,jdbc.queryForObject("SELECT userId FROM community_like WHERE postId=?",Long.class,id));
        mvc.perform(post("/community/post/list/page").contentType(MediaType.APPLICATION_JSON).content("{\"sort\":\"DROP TABLE\"}")).andExpect(jsonPath("$.code").value(40000));
    }
}
