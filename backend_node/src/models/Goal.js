const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Goal = sequelize.define('Goal', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  title: { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  target_date: { type: DataTypes.DATE },
  status: { type: DataTypes.STRING(50), defaultValue: 'active' },
  progress_pct: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_student_goal',
  timestamps: false,
});

module.exports = Goal;
