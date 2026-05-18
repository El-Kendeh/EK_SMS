const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ModificationRequest = sequelize.define('ModificationRequest', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT },
  subject_id: { type: DataTypes.BIGINT },
  grade_id: { type: DataTypes.BIGINT },
  requested_by: { type: DataTypes.BIGINT },
  request_type: { type: DataTypes.STRING(100) },
  reason: { type: DataTypes.TEXT },
  current_value: { type: DataTypes.STRING(255) },
  requested_value: { type: DataTypes.STRING(255) },
  status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  reviewed_by: { type: DataTypes.BIGINT },
  reviewed_at: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_modification_request',
  timestamps: false,
});

module.exports = ModificationRequest;
