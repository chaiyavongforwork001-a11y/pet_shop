CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`userName` text NOT NULL,
	`sender` text NOT NULL,
	`text` text NOT NULL,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `messages_user_created` ON `messages` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `order_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`orderId` text NOT NULL,
	`productId` text NOT NULL,
	`quantity` integer NOT NULL,
	`price` real NOT NULL,
	FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "line_positive_quantity" CHECK("order_lines"."quantity">0)
);
--> statement-breakpoint
CREATE INDEX `lines_order` ON `order_lines` (`orderId`);--> statement-breakpoint
CREATE TABLE `orders` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`userId` text NOT NULL,
	`customer` text NOT NULL,
	`items` text NOT NULL,
	`total` real NOT NULL,
	`shipping` real NOT NULL,
	`status` text DEFAULT 'awaiting_payment' NOT NULL,
	`tracking` text DEFAULT '' NOT NULL,
	`slip` text DEFAULT '' NOT NULL,
	`bank` text NOT NULL,
	`demo` integer NOT NULL,
	`createdAt` text NOT NULL,
	`requestId` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `orders_user_created` ON `orders` (`userId`,`createdAt`);--> statement-breakpoint
CREATE UNIQUE INDEX `orders_user_request` ON `orders` (`userId`,`requestId`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`brand` text NOT NULL,
	`pet` text NOT NULL,
	`category` text NOT NULL,
	`price` real NOT NULL,
	`originalPrice` real DEFAULT 0 NOT NULL,
	`size` text NOT NULL,
	`stock` integer DEFAULT 0 NOT NULL,
	`description` text NOT NULL,
	`image` text DEFAULT '' NOT NULL,
	`art` integer DEFAULT 0 NOT NULL,
	`badge` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	CONSTRAINT "products_stock_nonnegative" CHECK("products"."stock" >= 0),
	CONSTRAINT "products_price_nonnegative" CHECK("products"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TRIGGER order_inventory_check BEFORE INSERT ON order_lines
BEGIN
 SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM products WHERE id=NEW.productId AND active=1 AND stock>=NEW.quantity AND price=NEW.price) THEN RAISE(ABORT,'inventory_changed') END;
END;
--> statement-breakpoint
CREATE TRIGGER order_inventory_reserve AFTER INSERT ON order_lines
BEGIN
 UPDATE products SET stock=stock-NEW.quantity WHERE id=NEW.productId;
END;
--> statement-breakpoint
CREATE TRIGGER order_inventory_release AFTER UPDATE OF status ON orders
WHEN NEW.status='cancelled' AND OLD.status!='cancelled'
BEGIN
 UPDATE products SET stock=stock+COALESCE((SELECT SUM(quantity) FROM order_lines WHERE orderId=NEW.id AND productId=products.id),0) WHERE id IN (SELECT productId FROM order_lines WHERE orderId=NEW.id);
END;
