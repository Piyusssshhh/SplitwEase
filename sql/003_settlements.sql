-- Settlements record actual payments made to settle debts (e.g. "Rahul paid
-- Piyush 1300 via UPI"). This is an IMMUTABLE ledger — we never update or
-- delete a settlement, only ever insert new ones. This gives an honest,
-- auditable history of who paid whom and when.
CREATE TABLE IF NOT EXISTS settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    from_user UUID NOT NULL REFERENCES users(id),
    to_user UUID NOT NULL REFERENCES users(id),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    note VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);