package com.yupi.springbootinit.service.community;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.yupi.springbootinit.model.dto.community.CommunityRequests.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.yupi.springbootinit.service.community.CommunityStore.*;

@Service
public class CommunityInteractionService {
    private final CommunityStore db;
    public CommunityInteractionService(CommunityStore db) { this.db=db; }

    @Transactional(rollbackFor=Exception.class)
    public Map<String,Object> like(Like r,Long userId) {
        require(r!=null && r.getLiked()!=null,"请指定点赞状态");
        db.publicPost(r.getPostId(),true);
        if(r.getLiked()) db.jdbc().update("INSERT INTO community_like(postId,userId,createTime) VALUES (?,?,?) ON DUPLICATE KEY UPDATE userId=VALUES(userId)",r.getPostId(),userId,new Date());
        else db.jdbc().update("DELETE FROM community_like WHERE postId=? AND userId=?",r.getPostId(),userId);
        Map<String,Object> result=new LinkedHashMap<>(); result.put("liked",r.getLiked());
        result.put("likeCount",db.jdbc().queryForObject("SELECT COUNT(*) FROM community_like WHERE postId=?",Long.class,r.getPostId()));
        return result;
    }
    @Transactional(rollbackFor=Exception.class)
    public String comment(Comment r,Long userId,boolean official) {
        require(r!=null,"请填写评论"); String content=text(r.getContent(),2000,true,"评论");
        String key=text(r.getRequestKey(),80,true,"提交标识");
        require(key.matches("[A-Za-z0-9_-]{8,80}"),"提交标识须为 8 至 80 位字母数字、横线或下划线");
        Map<String,Object> post=db.publicPost(r.getPostId(),true);
        // Serialize a user's submissions, including retries across different posts and instances.
        lockRate(userId,"comment");
        List<Map<String,Object>> existing=db.jdbc().queryForList("SELECT id,postId,replyToId,content FROM community_comment WHERE userId=? AND requestKey=?",userId,key);
        if(!existing.isEmpty()) {
            Map<String,Object> c=existing.get(0);
            require(number(c,"postId")==r.getPostId() && Objects.equals(c.get("content"),content)
                    && Objects.equals(c.get("replyToId")==null?null:number(c,"replyToId"),r.getReplyToId()),"提交标识已用于另一条评论");
            return String.valueOf(c.get("id"));
        }
        Map<String,Object> rev=db.one("SELECT commentsEnabled FROM community_revision WHERE id=?",post.get("publishedRevisionId"));
        require(flag(rev.get("commentsEnabled")),"该帖子已关闭评论");
        Long rootId=null;
        if(r.getReplyToId()!=null) {
            Map<String,Object> parent=visibleComment(r.getReplyToId());
            require(number(parent,"postId")==r.getPostId(),"回复必须属于同一帖子");
            rootId=parent.get("rootId")==null ? number(parent,"id") : number(parent,"rootId");
        }
        Date recent=new Date(System.currentTimeMillis()-60000);
        List<Map<String,Object>> duplicates=db.jdbc().queryForList("SELECT id,replyToId FROM community_comment WHERE userId=? AND postId=? AND content=? AND createTime>? ORDER BY createTime DESC",userId,r.getPostId(),content,recent);
        for(Map<String,Object> c:duplicates) {
            if(Objects.equals(c.get("replyToId")==null?null:number(c,"replyToId"),r.getReplyToId()))
                return String.valueOf(c.get("id"));
        }
        consumeRate(userId,"comment",5);
        long id=IdWorker.getId();
        db.jdbc().update("INSERT INTO community_comment(id,postId,userId,rootId,replyToId,content,official,requestKey,createTime) VALUES (?,?,?,?,?,?,?,?,?)",
                id,r.getPostId(),userId,rootId,r.getReplyToId(),content,official,key,new Date());
        return String.valueOf(id);
    }
    private Map<String,Object> visibleComment(Long id) {
        validId(id);
        return db.one("SELECT c.* FROM community_comment c WHERE c.id=? AND "+VISIBLE_COMMENT,id);
    }
    public Map<String,Object> comments(Query q,boolean admin) {
        page(q); List<Object> args=new ArrayList<>();
        if(!admin) db.publicPost(q.getPostId(),false);
        String from="FROM community_comment c JOIN community_post p ON p.id=c.postId LEFT JOIN community_revision r ON r.id=p."
                +(admin?"draftRevisionId":"publishedRevisionId")+" LEFT JOIN user u ON u.id=c.userId AND u.isDelete=0 "
                +"LEFT JOIN community_comment parent ON parent.id=c.replyToId LEFT JOIN user ru ON ru.id=parent.userId AND ru.isDelete=0 WHERE c.isDelete=0"
                +(admin?"":" AND "+PUBLIC_POST+" AND "+VISIBLE_COMMENT);
        if(q.getPostId()!=null) { from+=" AND c.postId=?"; args.add(q.getPostId()); }
        if(!admin || q.getRootId()!=null) {
            if(q.getRootId()==null) from+=" AND c.rootId IS NULL";
            else { from+=" AND c.rootId=?"; args.add(q.getRootId()); }
        }
        if(admin && q.getHidden()!=null) { from+=" AND c.hidden=?"; args.add(q.getHidden()); }
        if(admin && q.getUserId()!=null) { from+=" AND c.userId=?"; args.add(q.getUserId()); }
        if(q.getKeyword()!=null && !q.getKeyword().trim().isEmpty()) { from+=" AND c.content LIKE ?"; args.add("%"+q.getKeyword().trim()+"%"); }
        String columns="c.id,c.postId,c.rootId,c.replyToId,c.content,c.official,c.createTime,COALESCE(u.userName,'用户') AS authorName,COALESCE(ru.userName,'用户') AS replyToName,"
                +"(SELECT COUNT(*) FROM community_comment reply WHERE reply.rootId=c.id AND reply.hidden=0 AND reply.isDelete=0) AS replyCount";
        if(admin) columns+=",c.userId,c.hidden,r.title AS postTitle,p.status AS postStatus,p.isDelete AS postDeleted,"
                +"(SELECT root.hidden FROM community_comment root WHERE root.id=c.rootId) AS rootHidden";
        return db.pageResult(from,columns,admin || q.getRootId()==null ? "c.createTime DESC,c.id DESC":"c.createTime ASC,c.id ASC",args,q);
    }
    @Transactional(rollbackFor=Exception.class)
    public void moderate(Moderate r) {
        require(r!=null && r.getHidden()!=null,"请选择显示状态"); validId(r.getId());
        Map<String,Object> comment=db.one("SELECT postId FROM community_comment WHERE id=?",r.getId());
        // Same lock as submissions: a reply cannot slip through while its root is being hidden.
        db.one("SELECT id FROM community_post WHERE id=? FOR UPDATE",comment.get("postId"));
        db.jdbc().update("UPDATE community_comment SET hidden=? WHERE id=?",r.getHidden(),r.getId());
    }
    @Transactional(rollbackFor=Exception.class)
    public String report(Report r,Long userId) {
        require(r!=null,"请填写举报"); String reason=text(r.getReason(),500,true,"举报原因");
        Map<String,Object> c=visibleComment(r.getCommentId());
        db.publicPost(number(c,"postId"),true);
        visibleComment(r.getCommentId());
        lockRate(userId,"report");
        List<Long> existing=db.jdbc().queryForList("SELECT id FROM community_report WHERE commentId=? AND userId=?",Long.class,r.getCommentId(),userId);
        if(!existing.isEmpty()) return String.valueOf(existing.get(0));
        consumeRate(userId,"report",5);
        long id=IdWorker.getId();
        db.jdbc().update("INSERT INTO community_report(id,commentId,userId,reason,createTime) VALUES (?,?,?,?,?)",id,r.getCommentId(),userId,reason,new Date());
        return String.valueOf(id);
    }
    public Map<String,Object> reports(Query q) {
        page(q); List<Object> args=new ArrayList<>();
        String from="FROM community_report report JOIN community_comment c ON c.id=report.commentId LEFT JOIN community_post p ON p.id=c.postId LEFT JOIN community_revision r ON r.id=p.draftRevisionId WHERE 1=1";
        if(q.getStatus()!=null && !q.getStatus().isEmpty()) { from+=" AND report.status=?"; args.add(q.getStatus()); }
        if(q.getPostId()!=null) { from+=" AND c.postId=?"; args.add(q.getPostId()); }
        return db.pageResult(from,"report.*,c.content,c.hidden,c.postId,r.title AS postTitle","report.createTime DESC,report.id DESC",args,q);
    }
    @Transactional(rollbackFor=Exception.class)
    public void resolve(ResolveReport r,Long adminId) {
        require(r!=null,"缺少举报编号"); validId(r.getId()); String resolution=text(r.getResolution(),500,true,"处理说明");
        db.one("SELECT id FROM community_report WHERE id=? FOR UPDATE",r.getId());
        db.jdbc().update("UPDATE community_report SET status='resolved',resolution=?,handledBy=?,handledAt=? WHERE id=?",resolution,adminId,new Date(),r.getId());
    }
    private void lockRate(Long userId,String action) {
        db.jdbc().update("INSERT INTO community_rate_limit(userId,action,windowStart,attempts) VALUES (?,?,0,0) ON DUPLICATE KEY UPDATE userId=VALUES(userId)",userId,action);
        db.one("SELECT userId FROM community_rate_limit WHERE userId=? AND action=? FOR UPDATE",userId,action);
    }
    private void consumeRate(Long userId,String action,int maximum) {
        Map<String,Object> row=db.one("SELECT windowStart,attempts FROM community_rate_limit WHERE userId=? AND action=?",userId,action);
        long now=System.currentTimeMillis(); boolean reset=now-number(row,"windowStart")>=60000;
        require(reset || number(row,"attempts")<maximum,"操作过于频繁，请一分钟后重试");
        db.jdbc().update("UPDATE community_rate_limit SET windowStart=?,attempts=? WHERE userId=? AND action=?",reset?now:number(row,"windowStart"),reset?1:number(row,"attempts")+1,userId,action);
    }
}
