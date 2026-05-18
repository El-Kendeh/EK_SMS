const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudyPlan = sequelize.define('StudyPlan', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  day_of_week: { type: DataTypes.STRING(20) },
  start_time: { type: DataTypes.STRING(10) },
  end_time: { type: DataTypes.STRING(10) },
  subject: { type: DataTypes.STRING(100) },
  activity: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_study_plan',
  timestamps: false,
});

module.exports = StudyPlan;
