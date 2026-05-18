const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudyGroup = sequelize.define('StudyGroup', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING(255) },
  subject_id: { type: DataTypes.BIGINT },
  teacher_id: { type: DataTypes.BIGINT },
  description: { type: DataTypes.TEXT },
  meeting_schedule: { type: DataTypes.STRING(255) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_study_group',
  timestamps: false,
});

module.exports = StudyGroup;
