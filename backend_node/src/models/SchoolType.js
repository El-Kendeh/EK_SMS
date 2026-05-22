const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SchoolType = sequelize.define('SchoolType', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_system_schooltype',
  timestamps: false,
});

module.exports = SchoolType;
