const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AcademicYear = sequelize.define('AcademicYear', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false }, // e.g., "2024/2025"
  start_date: { type: DataTypes.DATE },
  end_date: { type: DataTypes.DATE },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_academicyear',
  timestamps: false,
});

module.exports = AcademicYear;
