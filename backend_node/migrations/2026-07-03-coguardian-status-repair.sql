-- Parent portal data repair: school-admin-created guardian links were written
-- with is_active:true — a column the CoGuardian model does not have — so
-- Sequelize silently dropped it and every link defaulted to status='pending'.
-- The parent ownership helper (getParentStudentIds) only honours
-- status='active', so those parents saw no children.
-- School-created links are distinguishable from parent-initiated invites:
-- the invite flow always stamps invited_at; the school-admin flow never did.
-- NOTE: prod sync is OFF — run this manually on prod as well.

UPDATE pruh_core_co_guardian
SET status = 'active'
WHERE status = 'pending'
  AND invited_at IS NULL
  AND guardian_user_id IS NOT NULL;
