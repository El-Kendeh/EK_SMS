const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AcademicSystem = sequelize.define('AcademicSystem', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_system_academicsystem',
  timestamps: false,
});

module.exports = AcademicSystem;
