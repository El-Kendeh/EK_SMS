const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SystemOpsAlert = sequelize.define('SystemOpsAlert', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: true },
  severity: { type: DataTypes.STRING(32), defaultValue: 'medium' },
  trigger_type: { type: DataTypes.STRING(64), defaultValue: 'system' },
  status: { type: DataTypes.STRING(32), defaultValue: 'new' },
  notes: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'sa_system_ops_alerts',
  timestamps: false,
});

module.exports = SystemOpsAlert;
