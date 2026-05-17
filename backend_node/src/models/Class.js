const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Class = sequelize.define('Class', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: true },
  form: { type: DataTypes.STRING },
  form_number: { type: DataTypes.INTEGER, allowNull: true },
  category: { type: DataTypes.STRING },
  stream: { type: DataTypes.STRING, allowNull: true },
  class_teacher_id: { type: DataTypes.BIGINT, allowNull: true },
  capacity: { type: DataTypes.INTEGER, defaultValue: 50 },
  academic_year_id: { type: DataTypes.BIGINT, allowNull: true },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  room: { type: DataTypes.STRING, allowNull: true },
  start_time: { type: DataTypes.TIME, allowNull: true },
  end_time: { type: DataTypes.TIME, allowNull: true },
  colour_tag: { type: DataTypes.STRING, defaultValue: '#3B82F6' },
  education_level: { type: DataTypes.STRING, allowNull: true },
  track: { type: DataTypes.STRING, allowNull: true },
  notes: { type: DataTypes.TEXT, allowNull: true },
  auto_promotion_target_id: { type: DataTypes.BIGINT, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_class',
  timestamps: false,
});

module.exports = Class;
const ClassSubject = require('./ClassSubject');
const Teacher = require('./Teacher');
Class.hasMany(ClassSubject, { foreignKey: 'class_id', as: 'classSubjects' });
Class.belongsTo(Teacher, { foreignKey: 'class_teacher_id', as: 'classTeacher' });
