const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SecurityAuditLog = sequelize.define('SecurityAuditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  type: { type: DataTypes.STRING(64), allowNull: false },
  severity: { type: DataTypes.STRING(32), defaultValue: 'info' },
  actor: { type: DataTypes.STRING(255), defaultValue: '' },
  ip: { type: DataTypes.STRING(64), defaultValue: '—' },
  action: { type: DataTypes.TEXT, allowNull: false },
  metadata_json: { type: DataTypes.TEXT, allowNull: true },
  ts: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'sa_security_audit_log',
  timestamps: false,
});

module.exports = SecurityAuditLog;
