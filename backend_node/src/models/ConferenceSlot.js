const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ConferenceSlot = sequelize.define('ConferenceSlot', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT },
  date: { type: DataTypes.DATE },
  start_time: { type: DataTypes.STRING(10) },
  end_time: { type: DataTypes.STRING(10) },
  status: { type: DataTypes.STRING(50), defaultValue: 'available' },
  parent_id: { type: DataTypes.BIGINT },
  notes: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_conference_slot',
  timestamps: false,
});

module.exports = ConferenceSlot;
