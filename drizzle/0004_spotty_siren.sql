CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`productId` text NOT NULL,
	`userId` text NOT NULL,
	`orderId` text NOT NULL,
	`nickname` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text NOT NULL,
	`demo` integer NOT NULL,
	`createdAt` text NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "reviews_rating_valid" CHECK("reviews"."rating" >= 1 AND "reviews"."rating" <= 5)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reviews_product_user` ON `reviews` (`productId`,`userId`);--> statement-breakpoint
CREATE INDEX `reviews_product_demo_created` ON `reviews` (`productId`,`demo`,`createdAt`);