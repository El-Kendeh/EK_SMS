const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SchoolCapacity = sequelize.define('SchoolCapacity', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  capacity_category_id: { type: DataTypes.BIGINT, allowNull: false },
  capacity_amount: { type: DataTypes.INTEGER, allowNull: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_system_schoolcapacity',
  timestamps: false,
});

module.exports = SchoolCapacity;
