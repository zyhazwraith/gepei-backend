ALTER TABLE `refund_records`
MODIFY COLUMN `status` enum('pending','success','failed') DEFAULT 'pending';
--> statement-breakpoint
ALTER TABLE `refund_records`
ADD CONSTRAINT `uk_refund_order_id` UNIQUE(`order_id`);
