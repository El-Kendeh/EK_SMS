const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LessonPlan = sequelize.define('LessonPlan', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT, allowNull: false },
  class_id: { type: DataTypes.BIGINT },
  subject_id: { type: DataTypes.BIGINT },
  date: { type: DataTypes.DATE },
  topic: { type: DataTypes.STRING(255) },
  objectives: { type: DataTypes.TEXT },
  activities: { type: DataTypes.TEXT },
  materials: { type: DataTypes.TEXT },
  homework: { type: DataTypes.TEXT },
  reflection: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_lesson_plan',
  timestamps: false,
});

module.exports = LessonPlan;
