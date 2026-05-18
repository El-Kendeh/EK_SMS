const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SpotlightStudent = sequelize.define('SpotlightStudent', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT },
  student_id: { type: DataTypes.BIGINT },
  reason: { type: DataTypes.TEXT },
  week_start: { type: DataTypes.DATE },
  week_end: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_spotlight_student',
  timestamps: false,
});

module.exports = SpotlightStudent;
