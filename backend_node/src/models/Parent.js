const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Parent = sequelize.define('Parent', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
  first_name: { type: DataTypes.STRING(100), allowNull: false },
  last_name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(191), allowNull: true, unique: true },
  phone: { type: DataTypes.STRING(20), allowNull: true },
  passport_photo: { type: DataTypes.STRING(255) },
  address: { type: DataTypes.TEXT },
  occupation: { type: DataTypes.STRING(100) },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_parent',
  timestamps: false,
});

module.exports = Parent;
