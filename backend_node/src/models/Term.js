const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Term = sequelize.define('Term', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  academic_year_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // e.g., "Term 1", "Semester 1"
  start_date: { type: DataTypes.DATE },
  end_date: { type: DataTypes.DATE },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_term',
  timestamps: false,
});

module.exports = Term;
