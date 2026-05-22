const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GradingSystem = sequelize.define('GradingSystem', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_system_gradingsystem',
  timestamps: false,
});

module.exports = GradingSystem;
