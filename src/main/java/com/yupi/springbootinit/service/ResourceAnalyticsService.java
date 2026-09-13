package com.yupi.springbootinit.service;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.yupi.springbootinit.common.ErrorCode;
import com.yupi.springbootinit.exception.BusinessException;
import com.yupi.springbootinit.model.dto.analytics.DownloadPermissionRequest;
import com.yupi.springbootinit.model.dto.analytics.ResourceTrackRequest;
import com.yupi.springbootinit.model.entity.User;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.*;
import java.util.*;
import org.apache.commons.lang3.StringUtils;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Resource-scoped metrics. Byte counters describe application transfer, not cloud billing. */
@Service
public class ResourceAnalyticsService {
    public static final ZoneId ZONE = ZoneId.of("Asia/Shanghai");
    private final JdbcTemplate db;
    public ResourceAnalyticsService(JdbcTemplate db) { this.db = db; }
    public static LocalDate today() { return LocalDate.now(ZONE); }
    public static Timestamp now() { return Timestamp.valueOf(LocalDateTime.now(ZONE)); }

    public static String table(String type) {
        if ("artwork".equals(type) || "video_background".equals(type)) return type;
        if ("image_prompt".equals(type)) return "prompt_asset";
        throw new BusinessException(ErrorCode.PARAMS_ERROR, "Unsupported resourceType");
    }
    private static String favoriteColumn(String type) {
        return "artwork".equals(type) ? "artworkId" : "image_prompt".equals(type) ? "promptAssetId" : "videoBackgroundId";
    }
    public Map<String,Object> requirePublished(String type, Long id) {
        String name = table(type);
        if (id == null || id <= 0) throw new BusinessException(ErrorCode.PARAMS_ERROR);
        List<Map<String,Object>> rows = db.queryForList("SELECT * FROM " + name
                + " WHERE id=? AND isDelete=0 AND status=1" + ("image_prompt".equals(type) ? " AND assetType='image_prompt'" : ""), id);
        if (rows.isEmpty()) throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        return rows.get(0);
    }

    @Transactional
    public boolean track(ResourceTrackRequest r, User user) {
        if (r == null || !("view".equals(r.getAction()) || "copy".equals(r.getAction()))
                || r.getEventKey() == null || !r.getEventKey().matches("[A-Za-z0-9_-]{16,80}")) {
            throw new BusinessException(ErrorCode.PARAMS_ERROR);
        }
        requirePublished(r.getResourceType(), r.getResourceId());
        if ("copy".equals(r.getAction()) && user == null) throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        String actor;
        if (user != null) actor = "u:" + user.getId();
        else {
            if (r.getVisitorId() == null || !r.getVisitorId().matches("[A-Za-z0-9_-]{16,128}"))
                throw new BusinessException(ErrorCode.PARAMS_ERROR);
            actor = "v:" + hash(r.getVisitorId());
        }
        // A database row lock makes rolling-window deduplication work across application instances.
        db.update("INSERT IGNORE INTO resource_actor_guard(actor) VALUES (?)", actor);
        db.queryForList("SELECT actor FROM resource_actor_guard WHERE actor=? FOR UPDATE", actor);
        Timestamp time = now();
        if (db.queryForObject("SELECT COUNT(*) FROM resource_event WHERE actor=? AND eventKey=?", Long.class, actor, r.getEventKey()) > 0) return true;
        if (db.queryForObject("SELECT COUNT(*) FROM resource_event WHERE actor=? AND eventTime>=?", Long.class,
                actor, Timestamp.valueOf(time.toLocalDateTime().minusMinutes(1))) >= 60) return true;
        if ("view".equals(r.getAction()) && db.queryForObject(
                "SELECT COUNT(*) FROM resource_event WHERE actor=? AND resourceType=? AND resourceId=? AND action='view' AND eventTime>?",
                Long.class, actor, r.getResourceType(), r.getResourceId(), Timestamp.valueOf(time.toLocalDateTime().minusMinutes(30))) > 0) return true;
        db.update("INSERT INTO resource_event(id,resourceType,resourceId,actor,userId,action,eventKey,eventTime) VALUES (?,?,?,?,?,?,?,?)",
                IdWorker.getId(), r.getResourceType(), r.getResourceId(), actor, user == null ? null : user.getId(), r.getAction(), r.getEventKey(), time);
        return true;
    }
    private static String hash(String value) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
            StringBuilder out = new StringBuilder();
            for (byte b : bytes) out.append(String.format("%02x", b));
            return out.toString();
        } catch (Exception e) { throw new IllegalStateException(e); }
    }

    public void checkDownload(User user) {
        if (user == null) throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        List<Map<String,Object>> rows = db.queryForList("SELECT u.userRole, COALESCE(p.restricted,0) restricted FROM user u "
                + "LEFT JOIN resource_download_permission p ON p.userId=u.id WHERE u.id=? AND u.isDelete=0", user.getId());
        if (rows.isEmpty()) throw new BusinessException(ErrorCode.NOT_LOGIN_ERROR);
        Map<String,Object> row = rows.get(0);
        if ("ban".equals(row.get("userRole")) || ((Number) row.get("restricted")).intValue() == 1)
            throw new BusinessException(ErrorCode.DOWNLOAD_RESTRICTED);
    }
    @Transactional
    public boolean permission(DownloadPermissionRequest r, User operator) {
        if (r == null || r.getUserId() == null || r.getRestricted() == null || StringUtils.isBlank(r.getReason()) || r.getReason().length() > 500)
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "请填写限制或恢复原因（最多500字）");
        if (db.queryForObject("SELECT COUNT(*) FROM user WHERE id=? AND isDelete=0", Long.class, r.getUserId()) != 1)
            throw new BusinessException(ErrorCode.NOT_FOUND_ERROR);
        Timestamp time = now();
        db.update("INSERT INTO resource_download_permission(userId,restricted,reason,operatorId,updatedAt) VALUES (?,?,?,?,?) "
                + "ON DUPLICATE KEY UPDATE restricted=VALUES(restricted),reason=VALUES(reason),operatorId=VALUES(operatorId),updatedAt=VALUES(updatedAt)",
                r.getUserId(), r.getRestricted() ? 1 : 0, r.getReason().trim(), operator.getId(), time);
        db.update("INSERT INTO resource_download_permission_audit(id,userId,restricted,reason,operatorId,createdAt) VALUES (?,?,?,?,?,?)",
                IdWorker.getId(), r.getUserId(), r.getRestricted() ? 1 : 0, r.getReason().trim(), operator.getId(), time);
        return true;
    }
    public long startDownload(String type, long id, Long mediaId, User user) {
        checkDownload(user);
        long eventId = IdWorker.getId();
        db.update("INSERT INTO resource_download(id,resourceType,resourceId,mediaId,userId,status,startedAt) VALUES (?,?,?,?,?,'started',?)",
                eventId,type,id,mediaId,user.getId(),now());
        return eventId;
    }
    public void progress(long id, long bytes) {
        db.update("UPDATE resource_download SET transferredBytes=? WHERE id=?",bytes,id);
    }
    public void finish(long id, long bytes, boolean success, String failure) {
        db.update("UPDATE resource_download SET transferredBytes=?,status=?,failureCode=?,finishedAt=? WHERE id=?",
                bytes,success ? "completed" : "failed",failure,now(),id);
    }

    public static LocalDate[] range(LocalDate start, LocalDate end) {
        LocalDate to = end == null ? today() : end;
        LocalDate from = start == null ? to.minusDays(6) : start;
        if (to.isBefore(from) || to.isAfter(today()) || java.time.temporal.ChronoUnit.DAYS.between(from,to) > 365)
            throw new BusinessException(ErrorCode.PARAMS_ERROR, "日期范围应在过去366天内且结束日期不早于开始日期");
        return new LocalDate[]{from,to};
    }
    /** Only whitelist types, validated dates and a fixed table alias enter this SQL. */
    public static String hotOrder(String type, Integer days) {
        int count = days == null ? 7 : days;
        if (count != 7 && count != 30) throw new BusinessException(ErrorCode.PARAMS_ERROR, "hotDays must be 7 or 30");
        String name = table(type);
        LocalDate from = today().minusDays(count-1);
        return "ORDER BY " + score(type,name,from,today()) + " DESC," + name + ".createTime DESC," + name + ".id DESC";
    }
    private static String favoriteCount(String type, String alias, LocalDate from, LocalDate to) {
        return "(SELECT COUNT(*) FROM " + table(type) + "_favorite f WHERE f." + favoriteColumn(type) + "=" + alias + ".id AND f.isDelete=0"
                + (from == null ? "" : " AND f.createTime>='" + from + "' AND f.createTime<'" + to.plusDays(1) + "'") + ")";
    }
    private static String metric(String type,String alias,String column,LocalDate from,LocalDate to) {
        return "COALESCE((SELECT SUM(d."+column+") FROM resource_analytics_daily d WHERE d.resourceType='"+type+"' AND d.resourceId="+alias+".id AND d.statDate BETWEEN '"+from+"' AND '"+to+"'),0)";
    }
    private static String score(String type,String alias,LocalDate from,LocalDate to) {
        return "("+metric(type,alias,"effectiveDownloads",from,to)+"*5+"+favoriteCount(type,alias,from,to)+"*3+"
                +metric(type,alias,"views",from,to)+"+"+metric(type,alias,"effectiveCopies",from,to)+"*2)";
    }
    private String resourceRows(String type,LocalDate from,LocalDate to) {
        StringBuilder q = new StringBuilder("SELECT CAST(r.id AS CHAR) id,'"+type+"' resourceType,CAST(r.title AS CHAR) title,r.status,r.createTime,");
        for (String column : Arrays.asList("views","copies","effectiveCopies","requests","downloads","effectiveDownloads","transferredBytes"))
            q.append(metric(type,"r",column,from,to)).append(" ").append(column).append(",");
        q.append(favoriteCount(type,"r",null,null)).append(" favorites,").append(favoriteCount(type,"r",from,to)).append(" newFavorites,")
                .append(score(type,"r",from,to)).append(" hotScore,")
                .append("(SELECT COUNT(DISTINCT x.userId) FROM resource_download x WHERE x.resourceType='").append(type)
                .append("' AND x.resourceId=r.id AND x.status='completed' AND x.startedAt>='").append(from)
                .append("' AND x.startedAt<'").append(to.plusDays(1)).append("') downloadUsers FROM ").append(table(type))
                .append(" r WHERE r.isDelete=0").append("image_prompt".equals(type) ? " AND r.assetType='image_prompt'" : "");
        return q.toString();
    }
    public Map<String,Object> resources(LocalDate start,LocalDate end,String type,String sort,int page,int size) {
        LocalDate[] dates=range(start,end); size=Math.max(1,Math.min(size,100)); page=Math.max(1,page);
        List<String> types=StringUtils.isBlank(type) ? Arrays.asList("artwork","video_background","image_prompt") : Collections.singletonList(type);
        List<String> parts=new ArrayList<>(); for(String t:types) { table(t); parts.add(resourceRows(t,dates[0],dates[1])); }
        String union=String.join(" UNION ALL ",parts);
        if (!Arrays.asList("hotScore","views","favorites","newFavorites","downloads","requests","downloadUsers","copies","transferredBytes").contains(sort)) sort="hotScore";
        Map<String,Object> result=state();
        result.put("records",db.queryForList("SELECT * FROM ("+union+") ranked ORDER BY "+sort+" DESC,createTime DESC,id DESC LIMIT ? OFFSET ?",size,(page-1)*size));
        result.put("total",db.queryForObject("SELECT COUNT(*) FROM ("+union+") ranked",Long.class));
        return result;
    }
    public Map<String,Object> accounts(LocalDate start,LocalDate end,String sort,String keyword,int page,int size) {
        LocalDate[] dates=range(start,end); size=Math.max(1,Math.min(size,100));page=Math.max(1,page);
        if (!Arrays.asList("requests","downloads","transferredBytes","uniqueResources").contains(sort)) sort="transferredBytes";
        String base=" FROM user u LEFT JOIN (SELECT userId,COUNT(*) requests,SUM(status='completed') downloads,"
                +"COUNT(DISTINCT CONCAT(resourceType,':',resourceId)) uniqueResources,SUM(transferredBytes) transferredBytes FROM resource_download WHERE startedAt>=? AND startedAt<? GROUP BY userId) d ON d.userId=u.id "
                +"LEFT JOIN resource_download_permission p ON p.userId=u.id WHERE u.isDelete=0 AND (u.userName LIKE ? OR CAST(u.id AS CHAR)=?)";
        String term=StringUtils.defaultString(keyword).trim();
        Object[] args={dates[0].toString(),dates[1].plusDays(1).toString(),"%"+term+"%",term};
        Map<String,Object> result=state();
        List<Object> paged=new ArrayList<>(Arrays.asList(args));paged.add(size);paged.add((page-1)*size);
        result.put("records",db.queryForList("SELECT CAST(u.id AS CHAR) userId,u.userName,COALESCE(d.requests,0) requests,COALESCE(d.downloads,0) downloads,COALESCE(d.uniqueResources,0) uniqueResources,"
                +"COALESCE(d.transferredBytes,0) transferredBytes,COALESCE(p.restricted,0) restricted,p.reason,p.updatedAt"+base+" ORDER BY "+sort+" DESC,u.id DESC LIMIT ? OFFSET ?",paged.toArray()));
        result.put("total",db.queryForObject("SELECT COUNT(*)"+base,Long.class,args));return result;
    }
    public Map<String,Object> downloads(LocalDate start,LocalDate end,Long userId,String type,Long resourceId,int page,int size) {
        LocalDate[] dates=range(start,end); size=Math.max(1,Math.min(size,100));page=Math.max(1,page);
        List<Object> args=new ArrayList<>(Arrays.asList(dates[0].toString(),dates[1].plusDays(1).toString()));
        String where=" WHERE d.startedAt>=? AND d.startedAt<?";
        if(userId!=null) {where+=" AND d.userId=?";args.add(userId);}
        if(StringUtils.isNotBlank(type)) {table(type);where+=" AND d.resourceType=?";args.add(type);}
        if(resourceId!=null) {where+=" AND d.resourceId=?";args.add(resourceId);}
        Map<String,Object> result=state();
        result.put("total",db.queryForObject("SELECT COUNT(*) FROM resource_download d"+where,Long.class,args.toArray()));
        args.add(size);args.add((page-1)*size);
        result.put("records",db.queryForList("SELECT CAST(d.id AS CHAR) id,CAST(d.userId AS CHAR) userId,CAST(d.resourceId AS CHAR) resourceId,CAST(d.mediaId AS CHAR) mediaId,"
                +"u.userName,d.resourceType,COALESCE(CAST(a.title AS CHAR),CAST(v.title AS CHAR),CAST(p.title AS CHAR),'已删除资源') title,d.status,d.transferredBytes,d.startedAt,d.finishedAt,d.failureCode FROM resource_download d LEFT JOIN user u ON u.id=d.userId "
                +"LEFT JOIN artwork a ON d.resourceType='artwork' AND a.id=d.resourceId LEFT JOIN video_background v ON d.resourceType='video_background' AND v.id=d.resourceId "
                +"LEFT JOIN prompt_asset p ON d.resourceType='image_prompt' AND p.id=d.resourceId"+where+" ORDER BY d.startedAt DESC,d.id DESC LIMIT ? OFFSET ?",args.toArray()));return result;
    }
    public Map<String,Object> overview(LocalDate start,LocalDate end) {
        LocalDate[] dates=range(start,end);Map<String,Object> result=state();
        String q="SELECT resourceType,COUNT(*) requests,SUM(status='completed') downloads,COUNT(DISTINCT CASE WHEN status='completed' THEN userId END) downloadUsers,SUM(transferredBytes) transferredBytes FROM resource_download WHERE startedAt>=? AND startedAt<? GROUP BY resourceType";
        List<Map<String,Object>> types=db.queryForList(q,dates[0].toString(),dates[1].plusDays(1).toString());
        List<Map<String,Object>> daily=db.queryForList(q.replace("SELECT resourceType,","SELECT DATE(startedAt) statDate,resourceType,").replace("GROUP BY resourceType","GROUP BY DATE(startedAt),resourceType ORDER BY statDate"),dates[0].toString(),dates[1].plusDays(1).toString());
        Map<String,Map<String,Object>> typeIndex=new HashMap<>(),dayIndex=new HashMap<>();
        for(Map<String,Object> row:types) typeIndex.put(String.valueOf(row.get("resourceType")),row);
        for(Map<String,Object> row:daily) dayIndex.put(row.get("statDate")+":"+row.get("resourceType"),row);
        List<Map<String,Object>> filledTypes=new ArrayList<>(),filledDays=new ArrayList<>();
        for(String type:Arrays.asList("artwork","video_background","image_prompt")) {
            filledTypes.add(typeIndex.getOrDefault(type,emptyDownloadMetrics(type,null)));
        }
        for(LocalDate day=dates[0];!day.isAfter(dates[1]);day=day.plusDays(1)) {
            for(String type:Arrays.asList("artwork","video_background","image_prompt"))
                filledDays.add(dayIndex.getOrDefault(day+":"+type,emptyDownloadMetrics(type,day)));
        }
        result.put("types",filledTypes);result.put("daily",filledDays);return result;
    }
    private Map<String,Object> emptyDownloadMetrics(String type,LocalDate date) {
        Map<String,Object> row=new LinkedHashMap<>();row.put("resourceType",type);
        if(date!=null) row.put("statDate",date.toString());
        for(String column:Arrays.asList("requests","downloads","downloadUsers","transferredBytes")) row.put(column,0);
        return row;
    }
    public List<Map<String,Object>> audit(long userId) {
        return db.queryForList("SELECT CAST(a.id AS CHAR) id,a.restricted,a.reason,CAST(a.operatorId AS CHAR) operatorId,u.userName operatorName,a.createdAt FROM resource_download_permission_audit a LEFT JOIN user u ON u.id=a.operatorId WHERE a.userId=? ORDER BY a.createdAt DESC,a.id DESC LIMIT 100",userId);
    }
    public Map<String,Object> state() {
        List<Map<String,Object>> rows=db.queryForList("SELECT collectedFrom,updatedAt FROM resource_analytics_state WHERE id=1");
        return rows.isEmpty() ? new LinkedHashMap<>() : new LinkedHashMap<>(rows.get(0));
    }
    @Transactional
    public void aggregate() {
        List<Map<String,Object>> rows=db.queryForList("SELECT collectedFrom,updatedAt FROM resource_analytics_state WHERE id=1 FOR UPDATE");
        if(rows.isEmpty()) return;
        Timestamp tick=now();
        Object last=rows.get(0).get("updatedAt");
        LocalDate from=databaseDate(last==null ? rows.get(0).get("collectedFrom") : last);
        if(last!=null) from=from.minusDays(1);
        for(LocalDate date=from;!date.isAfter(today());date=date.plusDays(1)) {
            String begin=date.toString(),end=date.plusDays(1).toString();
            db.update("DELETE FROM resource_analytics_daily WHERE statDate=?",begin);
            db.update("INSERT INTO resource_analytics_daily(statDate,resourceType,resourceId,views,copies,effectiveCopies,requests,downloads,effectiveDownloads,transferredBytes,updatedAt) "
                    +"SELECT ?,resourceType,resourceId,SUM(views),SUM(copies),SUM(effectiveCopies),SUM(requests),SUM(downloads),SUM(effectiveDownloads),SUM(transferredBytes),? FROM ("
                    +"SELECT resourceType,resourceId,SUM(action='view') views,SUM(action='copy') copies,COUNT(DISTINCT CASE WHEN action='copy' THEN userId END) effectiveCopies,0 requests,0 downloads,0 effectiveDownloads,0 transferredBytes FROM resource_event WHERE eventTime>=? AND eventTime<? GROUP BY resourceType,resourceId UNION ALL "
                    +"SELECT resourceType,resourceId,0,0,0,COUNT(*),SUM(status='completed'),COUNT(DISTINCT CASE WHEN status='completed' THEN userId END),SUM(transferredBytes) FROM resource_download WHERE startedAt>=? AND startedAt<? GROUP BY resourceType,resourceId"
                    +") metrics GROUP BY resourceType,resourceId",begin,tick,begin,end,begin,end);
        }
        db.update("UPDATE resource_analytics_state SET updatedAt=? WHERE id=1",tick);
    }
    static LocalDate databaseDate(Object value) {
        // MySQL Connector/J returns LocalDateTime for DATETIME; H2 returns Timestamp.
        if(value instanceof LocalDateTime) return ((LocalDateTime)value).toLocalDate();
        if(value instanceof Timestamp) return ((Timestamp)value).toLocalDateTime().toLocalDate();
        throw new IllegalStateException("Unsupported database date type");
    }
}
