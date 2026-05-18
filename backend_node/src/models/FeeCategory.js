const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FeeCategory = sequelize.define('FeeCategory', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  frequency: { type: DataTypes.STRING, defaultValue: 'term' },
  applicable_classes: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_finance_fee_category',
  timestamps: false,
});

module.exports = FeeCategory;
