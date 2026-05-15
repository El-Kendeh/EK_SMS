const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Grade = sequelize.define('Grade', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  subject_id: { type: DataTypes.BIGINT, allowNull: false },
  term_id: { type: DataTypes.BIGINT, allowNull: false },
  classroom_id: { type: DataTypes.BIGINT },
  ca: { type: DataTypes.FLOAT }, // Continuous Assessment
  midterm: { type: DataTypes.FLOAT },
  final: { type: DataTypes.FLOAT },
  total: { type: DataTypes.FLOAT },
  grade_letter: { type: DataTypes.STRING }, // A, B, C, etc.
  remarks: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_grade',
  timestamps: false,
});

module.exports = Grade;
