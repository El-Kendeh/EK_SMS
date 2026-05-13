const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BroadcastAlert = sequelize.define('BroadcastAlert', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(255), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  severity: { type: DataTypes.STRING(32), defaultValue: 'info' },
  audience: { type: DataTypes.STRING(64), defaultValue: 'all' },
  target_school: { type: DataTypes.STRING(255), allowNull: true },
  status: { type: DataTypes.STRING(32), defaultValue: 'sent' },
  sent_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  created_by: { type: DataTypes.STRING(128), allowNull: true },
}, {
  tableName: 'sa_broadcast_alerts',
  timestamps: false,
});

module.exports = BroadcastAlert;
