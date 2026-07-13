const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const FeeCategory = sequelize.define('FeeCategory', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  // Plan 4.1 late-fee policy: applied (virtually, on read) once a fee is past
  // due_date + grace_days with a balance outstanding.
  late_fee_amount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  grace_days: { type: DataTypes.INTEGER, defaultValue: 0 },
  frequency: { type: DataTypes.STRING, defaultValue: 'term' },
  applicable_classes: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_finance_fee_category',
  timestamps: false,
});

module.exports = FeeCategory;
