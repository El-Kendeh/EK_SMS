const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Grade = sequelize.define('Grade', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  subject_id: { type: DataTypes.BIGINT, allowNull: false },
  term_id: { type: DataTypes.BIGINT, allowNull: false },
  classroom_id: { type: DataTypes.BIGINT },
  ca: { type: DataTypes.FLOAT },
  midterm: { type: DataTypes.FLOAT },
  final: { type: DataTypes.FLOAT },
  total: { type: DataTypes.FLOAT },
  grade_letter: { type: DataTypes.STRING },
  remarks: { type: DataTypes.TEXT },
  approval_status: { type: DataTypes.STRING, defaultValue: 'pending' },
  approved_by: { type: DataTypes.BIGINT },
  approved_at: { type: DataTypes.DATE },
  // Teacher-side lock: once a teacher locks a grade it is immutable to them
  // (corrections must go through a modification request). Distinct from principal
  // approval — a grade can be locked+pending before it is approved.
  is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
  locked_at: { type: DataTypes.DATE },
  locked_by: { type: DataTypes.BIGINT },
  // Report-card publication: approval makes a grade visible as a grade;
  // publication releases the compiled report card to students/parents.
  is_published: { type: DataTypes.BOOLEAN, defaultValue: false },
  published_at: { type: DataTypes.DATE },
  published_by: { type: DataTypes.BIGINT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_grade',
  timestamps: false,
});

module.exports = Grade;
