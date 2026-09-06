-- Run before starting the backend release. Existing configuration is preserved on rerun.
CREATE TABLE IF NOT EXISTS point_recharge_config (
    id BIGINT NOT NULL PRIMARY KEY,
    unitPrice DECIMAL(12,2) NOT NULL,
    pointsPerUnit INT NOT NULL,
    maxQuantity INT NOT NULL,
    status TINYINT NOT NULL DEFAULT 1
);
INSERT IGNORE INTO point_recharge_config (id, unitPrice, pointsPerUnit, maxQuantity, status)
VALUES (1, 1.00, 100, 1000, 1);

SET @recharge_column_exists = (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'member_order' AND COLUMN_NAME = 'rechargeQuantity');
SET @recharge_ddl = IF(@recharge_column_exists = 0,
    'ALTER TABLE member_order ADD COLUMN rechargeQuantity INT NULL COMMENT ''Points recharge unit count''', 'SELECT 1');
PREPARE recharge_stmt FROM @recharge_ddl;
EXECUTE recharge_stmt;
DEALLOCATE PREPARE recharge_stmt;
