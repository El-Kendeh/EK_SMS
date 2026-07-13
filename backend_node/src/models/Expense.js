const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Expense = sequelize.define('Expense', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  category: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: false },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  receipt_path: { type: DataTypes.STRING },
  // Who recorded the expense (the bursar/admin). Audited.
  created_by: { type: DataTypes.BIGINT },
  // Approval workflow: pending → approved | rejected. New expenses start 'pending';
  // only an approver (principal/school_admin/superadmin) can move them forward.
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  approved_by: { type: DataTypes.BIGINT },
  approved_at: { type: DataTypes.DATE },
  rejection_reason: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_finance_expense',
  timestamps: false,
});

module.exports = Expense;
