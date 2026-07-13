const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Fee = sequelize.define('Fee', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  fee_category_id: { type: DataTypes.BIGINT, allowNull: false },
  term_id: { type: DataTypes.BIGINT },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  amount_due: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  amount_paid: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
    // Plan 4.1: simple installment plan — amount_due is payable in N equal
  // parts; the schedule is derived (no separate table). 1 = pay in full.
  installment_count: { type: DataTypes.INTEGER, defaultValue: 1 },
  // Scholarship/discount label ("Merit scholarship", "Staff child", ...).
  discount_reason: { type: DataTypes.STRING(120) },
status: { type: DataTypes.STRING, defaultValue: 'pending' },
  due_date: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_finance_fee',
  timestamps: false,
});

module.exports = Fee;
