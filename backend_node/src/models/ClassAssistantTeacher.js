const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Teacher = require('./Teacher');
const User = require('./User');

const ClassAssistantTeacher = sequelize.define('ClassAssistantTeacher', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  class_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT, allowNull: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_class_assistant_teacher',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['class_id', 'teacher_id'] },
  ],
});

module.exports = ClassAssistantTeacher;
