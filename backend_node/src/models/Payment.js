const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  fee_id: { type: DataTypes.BIGINT },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  payment_method: { type: DataTypes.STRING, defaultValue: 'cash' },
  reference: { type: DataTypes.STRING },
  receipt_number: { type: DataTypes.STRING },
  payment_hash: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'completed' },
  notes: { type: DataTypes.TEXT },
  paid_by: { type: DataTypes.STRING },
  paid_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_finance_payment',
  timestamps: false,
});

module.exports = Payment;
