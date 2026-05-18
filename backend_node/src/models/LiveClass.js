const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LiveClass = sequelize.define('LiveClass', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT },
  class_id: { type: DataTypes.BIGINT },
  subject_id: { type: DataTypes.BIGINT },
  title: { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  meeting_url: { type: DataTypes.STRING(500) },
  scheduled_at: { type: DataTypes.DATE },
  duration_minutes: { type: DataTypes.INTEGER },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_live_class',
  timestamps: false,
});

module.exports = LiveClass;
