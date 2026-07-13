const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/* Plan 4.3 "Revenue vs. budget": a planned amount per school + term +
   category, compared against actual collections/expenses in the finance
   dashboards. One row per (school, term, category) — enforced by a unique
   key so budgets are upserted, not duplicated. */
const FinanceBudget = sequelize.define('FinanceBudget', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  term_id: { type: DataTypes.BIGINT, allowNull: true },
  category: { type: DataTypes.STRING(120), allowNull: false, defaultValue: 'general' },
  amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  notes: { type: DataTypes.STRING(255) },
  created_by: { type: DataTypes.BIGINT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_finance_budget',
  timestamps: false,
});

module.exports = FinanceBudget;
