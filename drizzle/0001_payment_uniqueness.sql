-- Phase 2 payment consistency hardening
-- 1) transaction_id is required and unique
-- 2) each (related_type, related_id) keeps one payment row

UPDATE payments
SET transaction_id = CONCAT('TX_LEGACY_', id)
WHERE transaction_id IS NULL OR transaction_id = '';

UPDATE payments p
JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY transaction_id ORDER BY id ASC) AS rn
  FROM payments
) ranked ON ranked.id = p.id
SET p.transaction_id = CONCAT(p.transaction_id, '_DUP_', p.id)
WHERE ranked.rn > 1;

DELETE p
FROM payments p
JOIN (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY related_type, related_id
      ORDER BY (status = 'success') DESC, id DESC
    ) AS rn
  FROM payments
) ranked ON ranked.id = p.id
WHERE ranked.rn > 1;

ALTER TABLE payments
  MODIFY COLUMN transaction_id varchar(64) NOT NULL;

DROP INDEX idx_transaction_id ON payments;
DROP INDEX idx_related ON payments;

CREATE UNIQUE INDEX uk_payments_transaction_id ON payments (transaction_id);
CREATE UNIQUE INDEX uk_payments_related ON payments (related_type, related_id);
