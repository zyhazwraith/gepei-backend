CREATE TABLE `attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploader_id` int NOT NULL,
	`key` varchar(255),
	`url` varchar(500) NOT NULL,
	`storage_type` enum('local','oss') DEFAULT 'local',
	`file_type` varchar(50),
	`usage_type` varchar(50),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `attachments_id` PRIMARY KEY(`id`),
	CONSTRAINT `attachments_key_unique` UNIQUE(`key`),
	CONSTRAINT `idx_key` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`operator_id` int NOT NULL,
	`action` varchar(50) NOT NULL,
	`target_type` varchar(50),
	`target_id` int,
	`details` json,
	`ip_address` varchar(45),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `check_in_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`type` enum('start','end') NOT NULL,
	`time` timestamp DEFAULT (now()),
	`latitude` decimal(10,6),
	`longitude` decimal(10,6),
	`attachment_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `check_in_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guides` (
	`user_id` int NOT NULL,
	`stage_name` varchar(50) NOT NULL,
	`real_name` varchar(50),
	`avatar_id` int,
	`id_number` varchar(18) NOT NULL,
	`city` varchar(50) NOT NULL,
	`address` varchar(255),
	`intro` text,
	`expected_price` int,
	`real_price` int,
	`tags` json,
	`photo_ids` json,
	`status` enum('online','offline') NOT NULL DEFAULT 'offline',
	`latitude` decimal(10,6),
	`longitude` decimal(10,6),
	`id_verified_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `guides_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `guides_id_number_unique` UNIQUE(`id_number`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_number` varchar(32) NOT NULL,
	`user_id` int NOT NULL,
	`guide_id` int NOT NULL,
	`creator_id` int,
	`type` enum('standard','custom') NOT NULL DEFAULT 'standard',
	`status` enum('pending','paid','waiting_service','in_service','service_ended','completed','cancelled','refunded') DEFAULT 'pending',
	`price_per_hour` int,
	`duration` int,
	`total_duration` int,
	`amount` int NOT NULL,
	`total_amount` int DEFAULT 0,
	`guide_income` int DEFAULT 0,
	`refund_amount` int DEFAULT 0,
	`content` text,
	`requirements` text,
	`service_start_time` timestamp,
	`service_end_time` timestamp,
	`paid_at` timestamp,
	`actual_end_time` timestamp,
	`service_address` varchar(255),
	`service_lat` decimal(10,6),
	`service_lng` decimal(10,6),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`)
);
--> statement-breakpoint
CREATE TABLE `overtime_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`duration` int NOT NULL,
	`fee` int NOT NULL,
	`status` enum('pending','paid') DEFAULT 'pending',
	`start_time` timestamp,
	`end_time` timestamp,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `overtime_records_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amount` int NOT NULL,
	`transaction_id` varchar(64),
	`payment_method` enum('wechat') DEFAULT 'wechat',
	`status` enum('pending','success','failed') DEFAULT 'pending',
	`related_type` enum('order','overtime') NOT NULL,
	`related_id` int NOT NULL,
	`paid_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `refund_records` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`amount` int NOT NULL,
	`reason` varchar(255),
	`out_refund_no` varchar(64),
	`refund_transaction_id` varchar(64),
	`status` enum('pending','success','failed') DEFAULT 'success',
	`operator_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `refund_records_id` PRIMARY KEY(`id`),
	CONSTRAINT `refund_records_out_refund_no_unique` UNIQUE(`out_refund_no`)
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
CREATE TABLE `system_configs` (
	`key` varchar(50) NOT NULL,
	`value` text,
	`description` varchar(100),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_configs_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phone` varchar(11) NOT NULL,
	`password` varchar(255) NOT NULL,
	`nickname` varchar(50),
	`is_guide` boolean DEFAULT false,
	`role` enum('user','admin','cs') NOT NULL DEFAULT 'user',
	`balance` int DEFAULT 0,
	`status` enum('active','banned') DEFAULT 'active',
	`ban_reason` varchar(255),
	`last_login_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`deleted_at` timestamp,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_phone_unique` UNIQUE(`phone`)
);
--> statement-breakpoint
CREATE TABLE `wallet_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`type` enum('income','withdraw_freeze','withdraw_unfreeze','withdraw_success','refund') NOT NULL,
	`amount` int NOT NULL,
	`related_type` varchar(50),
	`related_id` int,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `wallet_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `withdrawals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','completed','rejected') DEFAULT 'pending',
	`user_note` varchar(255),
	`admin_note` varchar(255),
	`bank_info` json,
	`audit_log_id` int,
	`processed_at` timestamp,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `withdrawals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_operator_id_users_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `check_in_records` ADD CONSTRAINT `check_in_records_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guides` ADD CONSTRAINT `guides_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_guide_id_users_id_fk` FOREIGN KEY (`guide_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `overtime_records` ADD CONSTRAINT `overtime_records_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refund_records` ADD CONSTRAINT `refund_records_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refund_records` ADD CONSTRAINT `refund_records_operator_id_users_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_guide_id_users_id_fk` FOREIGN KEY (`guide_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_logs` ADD CONSTRAINT `wallet_logs_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `withdrawals` ADD CONSTRAINT `withdrawals_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_uploader_id` ON `attachments` (`uploader_id`);--> statement-breakpoint
CREATE INDEX `idx_operator_id` ON `audit_logs` (`operator_id`);--> statement-breakpoint
CREATE INDEX `idx_action` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `check_in_records` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_city` ON `guides` (`city`);--> statement-breakpoint
CREATE INDEX `idx_deleted_at` ON `guides` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_order_number` ON `orders` (`order_number`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `orders` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_guide_id` ON `orders` (`guide_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `orders` (`status`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `orders` (`type`);--> statement-breakpoint
CREATE INDEX `idx_deleted_at` ON `orders` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `overtime_records` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_transaction_id` ON `payments` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `idx_related` ON `payments` (`related_type`,`related_id`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `refund_records` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_order_id` ON `reviews` (`order_id`);--> statement-breakpoint
CREATE INDEX `idx_guide_id` ON `reviews` (`guide_id`);--> statement-breakpoint
CREATE INDEX `idx_phone` ON `users` (`phone`);--> statement-breakpoint
CREATE INDEX `idx_is_guide` ON `users` (`is_guide`);--> statement-breakpoint
CREATE INDEX `idx_deleted_at` ON `users` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `wallet_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_type` ON `wallet_logs` (`type`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `withdrawals` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `withdrawals` (`status`);