const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LearningResource = sequelize.define('LearningResource', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  class_id: { type: DataTypes.BIGINT },
  subject_id: { type: DataTypes.BIGINT },
  teacher_id: { type: DataTypes.BIGINT },
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  resource_type: { type: DataTypes.STRING(50) },
  file_path: { type: DataTypes.STRING(500) },
  url: { type: DataTypes.STRING(500) },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  download_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_learning_resource',
  timestamps: false,
});

module.exports = LearningResource;
