const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Acknowledgment = sequelize.define('Acknowledgment', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  user_id: { type: DataTypes.BIGINT, allowNull: false },
  record_type: { type: DataTypes.STRING(100) },
  record_id: { type: DataTypes.BIGINT },
  acknowledged_at: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_acknowledgment',
  timestamps: false,
});

module.exports = Acknowledgment;
