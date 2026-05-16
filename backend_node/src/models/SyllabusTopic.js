const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SyllabusTopic = sequelize.define('SyllabusTopic', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  class_id: { type: DataTypes.BIGINT, allowNull: false },
  subject_id: { type: DataTypes.BIGINT, allowNull: false },
  term_id: { type: DataTypes.BIGINT, allowNull: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  group: { type: DataTypes.STRING, defaultValue: 'General' },
  status: { type: DataTypes.STRING, defaultValue: 'not_started' },
  priority: { type: DataTypes.STRING, defaultValue: 'medium' },
  duration_weeks: { type: DataTypes.INTEGER, defaultValue: 1 },
  date_covered: { type: DataTypes.DATEONLY, allowNull: true },
  teacher_id: { type: DataTypes.BIGINT, allowNull: true },
  week_number: { type: DataTypes.INTEGER, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_syllabus_topic',
  timestamps: false,
});

module.exports = SyllabusTopic;
