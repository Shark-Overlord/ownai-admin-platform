-- Initial community post categories. Safe to rerun: names are unique and existing rows are updated.
INSERT INTO community_category(id,name,description,sort,enabled) VALUES
  (UUID_SHORT(),'站点更新','OwnAI 功能更新、维护通知与版本说明',100,1),
  (UUID_SHORT(),'资源分享','提示词、源码、设计素材与实用工具',90,1),
  (UUID_SHORT(),'设计实践','UI/UX、交互设计与前端实现案例',80,1),
  (UUID_SHORT(),'Vibe Coding','AI 辅助开发、工作流与实战经验',70,1),
  (UUID_SHORT(),'社区讨论','问题交流、经验分享与意见建议',60,1)
ON DUPLICATE KEY UPDATE
  description=VALUES(description),
  sort=VALUES(sort),
  enabled=1;
