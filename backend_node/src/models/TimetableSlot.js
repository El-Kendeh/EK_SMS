const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * A single persisted weekly-timetable cell for a class.
 *  - day:    0 = Monday … 4 = Friday
 *  - period: 1-based period index within the day
 *  - is_break: a break/recess row (no subject/teacher)
 * Read by the student (own class), teacher (own teaching slots) and the
 * school-admin Timetable Manager (per-class grid). Written by the manager's
 * generate/clear actions. This is the single source of truth — before this,
 * every timetable view synthesized fake data on the fly.
 */
const TimetableSlot = sequelize.define('TimetableSlot', {
  id:         { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id:  { type: DataTypes.BIGINT, allowNull: false },
  class_id:   { type: DataTypes.BIGINT, allowNull: false },
  day:        { type: DataTypes.INTEGER, allowNull: false }, // 0=Mon..4=Fri
  period:     { type: DataTypes.INTEGER, allowNull: false }, // 1-based
  subject_id: { type: DataTypes.BIGINT, allowNull: true },
  teacher_id: { type: DataTypes.BIGINT, allowNull: true },
  start_time: { type: DataTypes.STRING(5), allowNull: true }, // 'HH:MM'
  end_time:   { type: DataTypes.STRING(5), allowNull: true },
  room:       { type: DataTypes.STRING, allowNull: true },
  is_break:   { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_timetable_slot',
  timestamps: false,
  indexes: [
    { fields: ['school_id'] },
    { fields: ['class_id'] },
    { fields: ['teacher_id'] },
    { unique: true, fields: ['class_id', 'day', 'period'] },
  ],
});

module.exports = TimetableSlot;
