CREATE TABLE `admin_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`admin_id` int NOT NULL,
	`action` varchar(100) NOT NULL,
	`target_type` varchar(50),
	`target_id` int,
	`details` json,
	`ip_address` varchar(45),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `admin_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `custom_order_candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`guide_id` int NOT NULL,
	`is_selected` boolean DEFAULT false,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `custom_order_candidates_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_order_guide` UNIQUE(`order_id`,`guide_id`)
);
--> statement-breakpoint
CREATE TABLE `custom_requirements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`destination` varchar(100) NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`people_count` int NOT NULL,
	`budget` decimal(10,2),
	`special_requirements` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `custom_requirements_id` PRIMARY KEY(`id`),
	CONSTRAINT `custom_requirements_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `guides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`id_number` varchar(18) NOT NULL,
	`city` varchar(50) NOT NULL,
	`intro` text,
	`hourly_price` decimal(10,2),
	`tags` json,
	`photos` json,
	`id_verified_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `guides_id` PRIMARY KEY(`id`),
	CONSTRAINT `guides_user_id_unique` UNIQUE(`user_id`),
	CONSTRAINT `guides_id_number_unique` UNIQUE(`id_number`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(32) NOT NULL,
	`user_id` int NOT NULL,
	`guide_id` int,
	`order_type` enum('normal','custom') NOT NULL,
	`status` enum('pending','paid','waiting_for_user','in_progress','completed','cancelled') DEFAULT 'pending',
	`service_date` date,
	`service_hours` int,
	`amount` decimal(10,2) NOT NULL,
	`deposit` decimal(10,2) DEFAULT '0.00',
	`requirements` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`payment_method` enum('wechat') DEFAULT 'wechat',
	`transaction_id` varchar(64),
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','success','failed') DEFAULT 'pending',
	`paid_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`user_id` int NOT NULL,
	`guide_id` int NOT NULL,
	`rating` int NOT NULL,
	`comment` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `reviews_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(11) NOT NULL,
	`password` varchar(255) NOT NULL,
	`nickname` varchar(50),
	`avatar_url` varchar(500),
	`is_guide` boolean DEFAULT false,
	`role` enum('user','admin') DEFAULT 'user',
	`balance` decimal(10,2) DEFAULT '0.00',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`amount` decimal(10,2) NOT NULL,
	`status` enum('pending','processing','completed','failed') DEFAULT 'pending',
	`bank_info` json,
	`processed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `admin_logs` ADD CONSTRAINT `admin_logs_admin_id_users_id_fk` FOREIGN KEY (`admin_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_order_candidates` ADD CONSTRAINT `custom_order_candidates_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_order_candidates` ADD CONSTRAINT `custom_order_candidates_guide_id_guides_id_fk` FOREIGN KEY (`guide_id`) REFERENCES `guides`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `custom_requirements` ADD CONSTRAINT `custom_requirements_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guides` ADD CONSTRAINT `guides_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_guide_id_guides_id_fk` FOREIGN KEY (`guide_id`) REFERENCES `guides`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_guide_id_guides_id_fk` FOREIGN KEY (`guide_id`) REFERENCES `guides`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_admin_id` ON `admin_logs` (`admin_id`);--> statement-breakpoint
CREATE INDEX `idx_action` ON `admin_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_created_at` ON `admin_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `custom_order_candidates` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_guide_id` ON `custom_order_candidates` (`guide_id`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `custom_requirements` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_city` ON `guides` (`city`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `guides` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_deleted_at` ON `guides` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_order_number` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_guide_id` ON `orders` (`guide_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_order_type` ON `orders` (`order_type`);--> statement-breakpoint
CREATE INDEX `idx_deleted_at` ON `orders` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `payments` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_transaction_id` ON `payments` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `reviews` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_guide_id` ON `reviews` (`guide_id`);--> statement-breakpoint
CREATE INDEX `idx_phone` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_is_guide` ON `users` (`is_guide`);--> statement-breakpoint
CREATE INDEX `idx_deleted_at` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `withdrawals` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `withdrawals` (`status`);