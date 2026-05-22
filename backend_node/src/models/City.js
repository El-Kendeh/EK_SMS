const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const City = sequelize.define('City', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  country_id: { type: DataTypes.BIGINT, allowNull: false },
  region_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_system_city',
  timestamps: false,
});

module.exports = City;
