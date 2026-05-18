const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OfficeHour = sequelize.define('OfficeHour', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT, allowNull: false },
  date: { type: DataTypes.DATE },
  start_time: { type: DataTypes.STRING(10) },
  end_time: { type: DataTypes.STRING(10) },
  slot_duration_minutes: { type: DataTypes.INTEGER, defaultValue: 30 },
  max_bookings: { type: DataTypes.INTEGER, defaultValue: 1 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_office_hour',
  timestamps: false,
});

module.exports = OfficeHour;
