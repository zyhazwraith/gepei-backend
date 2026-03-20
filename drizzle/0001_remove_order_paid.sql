UPDATE `orders`
SET `status` = 'waiting_service'
WHERE `status` = 'paid';
--> statement-breakpoint
ALTER TABLE `orders`
MODIFY COLUMN `status` enum('pending','waiting_service','in_service','service_ended','completed','cancelled','refunded') DEFAULT 'pending';
