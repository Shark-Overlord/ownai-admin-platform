package com.yupi.springbootinit.service.community;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.yupi.springbootinit.model.dto.community.CommunityRequests.*;
import com.yupi.springbootinit.model.dto.announcement.AnnouncementAddRequest;
import com.yupi.springbootinit.model.entity.User;
import com.yupi.springbootinit.service.AnnouncementService;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.yupi.springbootinit.service.community.CommunityStore.*;

@Service
public class CommunityPostService {
    private final CommunityStore db;
    private final CommunityTaxonomyService taxonomy;
    private final AnnouncementService announcements;
    public CommunityPostService(CommunityStore db, CommunityTaxonomyService taxonomy, AnnouncementService announcements) {
        this.db=db; this.taxonomy=taxonomy; this.announcements=announcements;
    }
    @Transactional(rollbackFor=Exception.class)
    public Map<String,Object> save(SavePost r,Long adminId) {
        require(r!=null,"请填写帖子");
        String title=text(r.getTitle(),150,true,"标题"), summary=text(r.getSummary(),300,false,"摘要");
        String cover=mediaUrl(r.getCoverUrl());
        // Preserve Markdown exactly, including whitespace, rather than converting it to HTML.
        String markdown=r.getMarkdown()==null ? "" : r.getMarkdown();
        require(markdown.length()<=200000,"正文最多 200000 字符");
        List<Long> tags=r.getTagIds()==null ? Collections.emptyList() : r.getTagIds();
        require(tags.size()<=20 && tags.stream().allMatch(id->id!=null && id>0),"最多选择 20 个有效标签");
        long id=r.getId()==null ? IdWorker.getId() : r.getId();
        Map<String,Object> previous=null;
        Date now=new Date();
        if(r.getId()!=null) {
            Map<String,Object> post=db.post(id,true); version(post,r.getVersion());
            previous=db.one("SELECT * FROM community_revision WHERE id=?",post.get("draftRevisionId"));
        } else {
            db.jdbc().update("INSERT INTO community_post(id,authorId,status,version,createTime,updateTime,isDelete) VALUES (?,?,'draft',0,?,?,0)",id,adminId,now,now);
        }
        taxonomy.validateReferences(r.getCategoryId(),tags,previous);
        long revisionId=IdWorker.getId();
        db.jdbc().update("INSERT INTO community_revision(id,postId,title,summary,coverUrl,categoryId,markdown,commentsEnabled,createdBy,createTime) VALUES (?,?,?,?,?,?,?,?,?,?)",
                revisionId,id,title,summary,cover,r.getCategoryId(),markdown,!Boolean.FALSE.equals(r.getCommentsEnabled()),adminId,now);
        for(Long tagId:new LinkedHashSet<>(tags)) db.jdbc().update("INSERT INTO community_revision_tag(revisionId,tagId) VALUES (?,?)",revisionId,tagId);
        db.jdbc().update("UPDATE community_post SET draftRevisionId=?,version=version+1,updateTime=? WHERE id=?",revisionId,now,id);
        return getAdmin(id);
    }
    public Map<String,Object> getAdmin(Long id) {
        Map<String,Object> p=db.post(id,false);
        p.put("draft",revision(p.get("draftRevisionId")));
        p.put("published",p.get("publishedRevisionId")==null ? null : revision(p.get("publishedRevisionId")));
        p.put("hasUnpublishedChanges",!Objects.equals(p.get("draftRevisionId"),p.get("publishedRevisionId")));
        return p;
    }
    private Map<String,Object> revision(Object id) {
        Map<String,Object> r=db.one("SELECT id,title,summary,coverUrl,categoryId,markdown,commentsEnabled,createTime FROM community_revision WHERE id=?",id);
        r.put("tagIds",db.jdbc().queryForList("SELECT tagId FROM community_revision_tag WHERE revisionId=? ORDER BY tagId",Long.class,id));
        return r;
    }
    @Transactional(rollbackFor=Exception.class)
    public void action(PostAction r,String action) {
        require(r!=null,"缺少帖子编号"); Map<String,Object> p=db.post(r.getId(),true); version(p,r.getVersion());
        if("publish".equals(action)) {
            Map<String,Object> rev=revision(p.get("draftRevisionId"));
            require(rev.get("categoryId")!=null,"发布前请选择主分类");
            require(!((String)rev.get("markdown")).trim().isEmpty(),"发布前请填写正文");
            db.jdbc().update("UPDATE community_post SET status='published',publishedRevisionId=draftRevisionId,firstPublishedAt=COALESCE(firstPublishedAt,?),version=version+1,updateTime=? WHERE id=?",new Date(),new Date(),r.getId());
        } else if("offline".equals(action)) {
            db.jdbc().update("UPDATE community_post SET status='offline',version=version+1,updateTime=? WHERE id=?",new Date(),r.getId());
        } else if("delete".equals(action)) {
            db.jdbc().update("UPDATE community_post SET isDelete=1,version=version+1,updateTime=? WHERE id=?",new Date(),r.getId());
        } else require(false,"操作不合法");
    }
    @SuppressWarnings("unchecked")
    public Map<String,Object> list(Query q,boolean admin) {
        page(q); List<Object> args=new ArrayList<>();
        String from="FROM community_post p JOIN community_revision r ON r.id=p."+(admin?"draftRevisionId":"publishedRevisionId")
                +" LEFT JOIN community_category cat ON cat.id=r.categoryId WHERE "+(admin?"p.isDelete=0":PUBLIC_POST);
        if(q.getCategoryId()!=null) { from+=" AND r.categoryId=?"; args.add(q.getCategoryId()); }
        if(q.getTagId()!=null) { from+=" AND EXISTS (SELECT 1 FROM community_revision_tag rt WHERE rt.revisionId=r.id AND rt.tagId=?)"; args.add(q.getTagId()); }
        if(q.getKeyword()!=null && !q.getKeyword().trim().isEmpty()) { from+=" AND r.title LIKE ?"; args.add("%"+q.getKeyword().trim()+"%"); }
        if(admin && q.getStatus()!=null && !q.getStatus().isEmpty()) { from+=" AND p.status=?"; args.add(q.getStatus()); }
        String columns="p.id,r.id AS revisionId,r.title,r.summary,r.coverUrl,r.categoryId,cat.name AS categoryName,p.firstPublishedAt,"+COUNTS;
        if(admin) columns+=",p.status,p.version,p.updateTime,(p.publishedRevisionId IS NULL OR p.draftRevisionId<>p.publishedRevisionId) AS hasUnpublishedChanges";
        // MySQL cannot use a select-list alias inside an ORDER BY expression on all supported versions.
        String score="(SELECT COUNT(*) FROM community_like l WHERE l.postId=p.id)+(SELECT COUNT(*) FROM community_comment c WHERE c.postId=p.id AND "+VISIBLE_COMMENT+")";
        Map<String,Object> result=db.pageResult(from,columns,("popular".equals(q.getSort())?"("+score+") DESC,":"")+"p.firstPublishedAt DESC,p.id DESC",args,q);
        for(Map<String,Object> row:(List<Map<String,Object>>)result.get("records")) {
            row.put("tags",tags(row.remove("revisionId")));
            row.put("popularity",number(row,"likeCount")+number(row,"commentCount"));
        }
        return result;
    }
    public Map<String,Object> getPublic(Long id,Long userId) {
        validId(id);
        Map<String,Object> result=db.one("SELECT p.id,r.id AS revisionId,r.title,r.summary,r.coverUrl,r.markdown,r.commentsEnabled,r.categoryId,cat.name AS categoryName,p.firstPublishedAt,"+COUNTS
                +" FROM community_post p JOIN community_revision r ON r.id=p.publishedRevisionId LEFT JOIN community_category cat ON cat.id=r.categoryId WHERE "+PUBLIC_POST+" AND p.id=?",id);
        result.put("tags",tags(result.remove("revisionId")));
        result.put("popularity",number(result,"likeCount")+number(result,"commentCount"));
        result.put("liked",userId!=null && db.jdbc().queryForObject("SELECT COUNT(*) FROM community_like WHERE postId=? AND userId=?",Long.class,id,userId)>0);
        return result;
    }
    private List<Map<String,Object>> tags(Object revisionId) {
        return db.jdbc().queryForList("SELECT t.id,t.name FROM community_tag t JOIN community_revision_tag rt ON rt.tagId=t.id WHERE rt.revisionId=? ORDER BY t.sort DESC,t.id DESC",revisionId);
    }
    @Transactional(rollbackFor=Exception.class)
    public String announcement(PostAction r,User admin) {
        require(r!=null,"缺少帖子编号"); Map<String,Object> p=db.publicPost(r.getId(),true); version(p,r.getVersion());
        Map<String,Object> rev=revision(p.get("publishedRevisionId"));
        AnnouncementAddRequest request=new AnnouncementAddRequest();
        String title=(String)rev.get("title");
        int end=Math.min(100,title.length());
        if(end<title.length() && Character.isHighSurrogate(title.charAt(end-1))) end--;
        request.setTitle(title.substring(0,end)); request.setSummary((String)rev.get("summary"));
        request.setContent(((String)rev.get("summary")).isEmpty() ? (String)rev.get("title") : (String)rev.get("summary"));
        request.setStatus("draft"); request.setType("site_update"); request.setPublicVisible(true); request.setPopupEnabled(false);
        Long id=announcements.addAnnouncement(request,admin);
        db.jdbc().update("UPDATE announcement SET targetType='community_post',targetId=? WHERE id=?",r.getId(),id);
        return String.valueOf(id);
    }
}
