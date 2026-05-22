const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SystemTerm = sequelize.define('SystemTerm', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  system_academic_year_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING(100), allowNull: false },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_system_term',
  timestamps: false,
});

module.exports = SystemTerm;
