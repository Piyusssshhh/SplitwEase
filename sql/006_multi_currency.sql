-- Adds multi-currency support to expenses. Every expense keeps its ORIGINAL
-- currency + amount (for display, e.g. "$50"), plus a base_amount in the
-- group's base currency (INR) used for all balance/debt calculations.
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'INR';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12, 2);

UPDATE expenses SET base_amount = amount WHERE base_amount IS NULL;

ALTER TABLE expenses ALTER COLUMN base_amount SET NOT NULL;