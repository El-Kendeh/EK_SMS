const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WhistleblowerReport = sequelize.define('WhistleblowerReport', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  category_id: { type: DataTypes.BIGINT },
  title: { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  severity: { type: DataTypes.STRING(50) },
  follow_up_key: { type: DataTypes.STRING(100), unique: true },
  status: { type: DataTypes.STRING(50), defaultValue: 'received' },
  reporter_type: { type: DataTypes.STRING(50) },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_whistleblower_report',
  timestamps: false,
});

module.exports = WhistleblowerReport;
