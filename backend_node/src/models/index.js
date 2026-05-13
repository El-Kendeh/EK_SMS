/**
 * Side-effect imports so `sequelize.sync({ alter: true })` creates/updates all tables.
 */
require('./User');
require('./School');
require('./SchoolAdmin');
require('./OTP');
require('./SecurityAuditLog');
require('./SuperadminSettings');
require('./BroadcastAlert');
require('./SystemOpsAlert');
require('./ForensicEvent');
