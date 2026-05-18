const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PermissionSlip = sequelize.define('PermissionSlip', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  title: { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  event_date: { type: DataTypes.DATE },
  expiry_date: { type: DataTypes.DATE },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_permission_slip',
  timestamps: false,
});

module.exports = PermissionSlip;
