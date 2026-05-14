const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Exam = sequelize.define('Exam', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  term_id: { type: DataTypes.INTEGER },
  name: { type: DataTypes.STRING, allowNull: false },
  date: { type: DataTypes.DATE },
  subject_id: { type: DataTypes.INTEGER },
  classroom_id: { type: DataTypes.INTEGER },
  total_marks: { type: DataTypes.FLOAT, defaultValue: 100 },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_exam',
  timestamps: false,
});

module.exports = Exam;
