DROP INDEX `reviews_product_user`;--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_product_user_mode` ON `reviews` (`productId`,`userId`,`demo`);