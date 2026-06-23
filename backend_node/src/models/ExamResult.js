const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Per-student marks for a single exam. Separate from the Grade model (which holds
 * ca/midterm/final per subject/term) — an ExamResult is one exam's score for one
 * student. Unique on (exam_id, student_id) so saving results upserts cleanly.
 *
 * NOTE: dev auto-creates this table via db.sync({alter}); PRODUCTION needs a manual
 *   CREATE TABLE pruh_core_exam_result (...)  — see schoolAdminUIFix/CHANGELOG.
 */
const ExamResult = sequelize.define('ExamResult', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  exam_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  marks: { type: DataTypes.FLOAT },
  remarks: { type: DataTypes.STRING(255) },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_exam_result',
  timestamps: false,
  indexes: [{ unique: true, fields: ['exam_id', 'student_id'] }],
});

module.exports = ExamResult;
