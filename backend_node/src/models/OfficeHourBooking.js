const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OfficeHourBooking = sequelize.define('OfficeHourBooking', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  office_hour_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT },
  parent_id: { type: DataTypes.BIGINT },
  status: { type: DataTypes.STRING(50), defaultValue: 'booked' },
  notes: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_office_hour_booking',
  timestamps: false,
});

module.exports = OfficeHourBooking;
