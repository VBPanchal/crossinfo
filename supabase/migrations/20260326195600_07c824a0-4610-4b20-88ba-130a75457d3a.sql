
ALTER TABLE stores ADD COLUMN IF NOT EXISTS delivery_mode text NOT NULL DEFAULT 'both';
ALTER TABLE customer_orders ADD COLUMN IF NOT EXISTS delivery_address text DEFAULT '';
