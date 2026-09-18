CREATE INDEX `orders_status_created` ON `orders` (`status`,`createdAt`);
--> statement-breakpoint
CREATE TRIGGER order_pending_limit BEFORE INSERT ON orders
WHEN (SELECT COUNT(*) FROM orders WHERE userId=NEW.userId AND status IN ('awaiting_payment','reviewing'))>=10
BEGIN
 SELECT RAISE(ABORT,'pending_limit');
END;
