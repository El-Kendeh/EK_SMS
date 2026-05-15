const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Class = sequelize.define('Class', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  form: { type: DataTypes.STRING }, // e.g., "Form 1", "Grade 10"
  category: { type: DataTypes.STRING }, // e.g., "Science", "Arts", "Commercial"
  class_teacher_id: { type: DataTypes.BIGINT },
  capacity: { type: DataTypes.INTEGER },
  academic_year_id: { type: DataTypes.BIGINT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_class',
  timestamps: false,
});

module.exports = Class;
