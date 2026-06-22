const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Append-only, hash-chained audit trail for every grade mutation.
 * Rows are NEVER updated or deleted — each event carries the hash of the
 * previous event for its school, so any tampering breaks the chain.
 * Backs the "every grade is cryptographically signed" guarantee the UI makes.
 */
const GradeEvent = sequelize.define('GradeEvent', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  grade_id: { type: DataTypes.BIGINT, allowNull: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: true },
  subject_id: { type: DataTypes.BIGINT, allowNull: true },
  term_id: { type: DataTypes.BIGINT, allowNull: true },
  actor_user_id: { type: DataTypes.BIGINT, allowNull: true },
  actor_name: { type: DataTypes.STRING(191), allowNull: true },
  // create | update | submit | approve | reject | publish | unpublish
  event_type: { type: DataTypes.STRING(20), allowNull: false },
  field: { type: DataTypes.STRING(40), allowNull: true },
  old_value: { type: DataTypes.TEXT, allowNull: true },
  new_value: { type: DataTypes.TEXT, allowNull: true },
  approval_status_after: { type: DataTypes.STRING(20), allowNull: true },
  prev_hash: { type: DataTypes.STRING(64), allowNull: true },
  hash: { type: DataTypes.STRING(64), allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_grade_event',
  timestamps: false,
});

module.exports = GradeEvent;
