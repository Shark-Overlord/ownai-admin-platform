package com.yupi.springbootinit.service.community;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.community.CommunityRequests.Taxonomy;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.yupi.springbootinit.service.community.CommunityStore.*;

@Service
public class CommunityTaxonomyService {
    private final CommunityStore db;
    public CommunityTaxonomyService(CommunityStore db) { this.db=db; }
    private String table(String kind) {
        require("category".equals(kind) || "tag".equals(kind), "分类类型不合法");
        return "community_"+kind;
    }
    public List<Map<String,Object>> list(String kind, boolean admin) {
        String t=table(kind);
        // Disabled terms remain discoverable when used by a published post, without exposing draft-only terms.
        String used="category".equals(kind) ? "r.categoryId=t.id" :
                "EXISTS (SELECT 1 FROM community_revision_tag rt WHERE rt.revisionId=r.id AND rt.tagId=t.id)";
        String count="(SELECT COUNT(*) FROM community_post p JOIN community_revision r ON r.id=p.publishedRevisionId WHERE "
                +PUBLIC_POST+" AND "+used+")";
        return db.jdbc().queryForList("SELECT t.id,t.name,t.description,t.sort,t.enabled,"+count+" AS postCount FROM "+t+" t"
                +(admin ? "" : " WHERE t.enabled=1 OR "+count+">0")+" ORDER BY t.sort DESC,t.id DESC");
    }
    @Transactional(rollbackFor=Exception.class)
    public Long save(String kind, Taxonomy r) {
        String t=table(kind); require(r!=null,"请填写分类或标签");
        String name=text(r.getName(),60,true,"名称"), description=text(r.getDescription(),300,false,"描述");
        require(r.getSort()!=null && r.getEnabled()!=null,"排序和启用状态不能为空");
        try {
            if(r.getId()==null) {
                long id=IdWorker.getId();
                db.jdbc().update("INSERT INTO "+t+" (id,name,description,sort,enabled) VALUES (?,?,?,?,?)",id,name,description,r.getSort(),r.getEnabled());
                return id;
            }
            validId(r.getId()); db.one("SELECT id FROM "+t+" WHERE id=? FOR UPDATE",r.getId());
            db.jdbc().update("UPDATE "+t+" SET name=?,description=?,sort=?,enabled=? WHERE id=?",name,description,r.getSort(),r.getEnabled(),r.getId());
            return r.getId();
        } catch(DuplicateKeyException e) { throw new BusinessException(ErrorCode.PARAMS_ERROR,"名称已存在"); }
    }
    @Transactional(rollbackFor=Exception.class)
    public void delete(String kind, Long id) {
        String t=table(kind); validId(id);
        db.one("SELECT id FROM "+t+" WHERE id=? FOR UPDATE",id);
        String sql="category".equals(kind) ? "SELECT COUNT(*) FROM community_revision WHERE categoryId=?"
                : "SELECT COUNT(*) FROM community_revision_tag WHERE tagId=?";
        require(db.jdbc().queryForObject(sql,Long.class,id)==0,"分类或标签已被内容版本引用，请改用停用");
        db.jdbc().update("DELETE FROM "+t+" WHERE id=?",id);
    }
    void validateReferences(Long categoryId,List<Long> tags,Map<String,Object> previous) {
        Long previousCategory=previous==null || previous.get("categoryId")==null ? null : number(previous,"categoryId");
        if(categoryId!=null) {
            validId(categoryId);
            Map<String,Object> category=db.one("SELECT enabled FROM community_category WHERE id=? FOR UPDATE",categoryId);
            require(flag(category.get("enabled")) || categoryId.equals(previousCategory),"该分类已停用");
        }
        List<Long> previousTags=previous==null ? Collections.emptyList() : db.jdbc().queryForList(
                "SELECT tagId FROM community_revision_tag WHERE revisionId=?",Long.class,previous.get("id"));
        for(Long id:new TreeSet<>(tags)) {
            validId(id);
            Map<String,Object> tag=db.one("SELECT enabled FROM community_tag WHERE id=? FOR UPDATE",id);
            require(flag(tag.get("enabled")) || previousTags.contains(id),"所选标签已停用");
        }
    }
}
