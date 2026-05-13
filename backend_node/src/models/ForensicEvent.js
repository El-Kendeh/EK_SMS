const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ForensicEvent = sequelize.define('ForensicEvent', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  event_type: { type: DataTypes.STRING(64), allowNull: false },
  event_label: { type: DataTypes.STRING(255), allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  actor: { type: DataTypes.STRING(255), defaultValue: '' },
  ip: { type: DataTypes.STRING(64), defaultValue: '—' },
  severity: { type: DataTypes.STRING(32), defaultValue: 'medium' },
  resolved: { type: DataTypes.BOOLEAN, defaultValue: false },
  resolved_at: { type: DataTypes.DATE, allowNull: true },
  metadata_json: { type: DataTypes.TEXT, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'sa_forensic_events',
  timestamps: false,
});

module.exports = ForensicEvent;
