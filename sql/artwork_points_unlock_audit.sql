-- Read-only audit; no account identities or prompt content are returned.
SELECT pointsPrice,COUNT(*) AS works FROM artwork WHERE isDelete=0 GROUP BY pointsPrice;
SELECT orderType,orderStatus,COUNT(*) AS orders FROM artwork_order GROUP BY orderType,orderStatus;
SELECT a.accessType,COUNT(*) AS grants FROM artwork_access a GROUP BY a.accessType;
SELECT COUNT(*) AS verifiedPointsOrders FROM artwork_order o
WHERE o.orderType='points' AND o.orderStatus='completed' AND o.pointsAmount>0
AND EXISTS (SELECT 1 FROM point_record p WHERE p.userId=o.userId AND p.relatedType='order'
    AND p.relatedId=o.id AND p.changeType='redeem_consume' AND p.changeAmount=-o.pointsAmount);
SELECT COUNT(*) AS unverifiedPointsOrders FROM artwork_order o
WHERE o.orderType='points' AND o.orderStatus='completed'
AND NOT EXISTS (SELECT 1 FROM point_record p WHERE p.userId=o.userId AND p.relatedType='order'
    AND p.relatedId=o.id AND p.changeType='redeem_consume' AND p.changeAmount=-o.pointsAmount AND o.pointsAmount>0);
SELECT COUNT(*) AS repeatedDebits FROM (
    SELECT userId,relatedId FROM point_record WHERE relatedType='order' AND changeType='redeem_consume'
    GROUP BY userId,relatedId HAVING COUNT(*)>1
) duplicates;
