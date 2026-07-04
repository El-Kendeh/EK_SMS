-- Pickup allow-list: optional gate-pass expiry date + UI tag colour.
-- The parent portal's pickup form has always collected these; the columns
-- were missing so both values were silently dropped (data loss).
-- Apply manually on prod (sync is OFF).

ALTER TABLE pruh_core_pickup_person
  ADD COLUMN expiry DATE NULL AFTER relationship,
  ADD COLUMN photo_color VARCHAR(16) NULL AFTER expiry;
