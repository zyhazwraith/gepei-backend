ALTER TABLE `payments`
RENAME COLUMN `transaction_id` TO `out_trade_no`;
--> statement-breakpoint
ALTER TABLE `payments`
DROP INDEX `uk_payments_transaction_id`;
--> statement-breakpoint
ALTER TABLE `payments`
ADD CONSTRAINT `uk_payments_out_trade_no` UNIQUE(`out_trade_no`);
