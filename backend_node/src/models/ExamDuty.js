const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ExamDuty = sequelize.define('ExamDuty', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  exam_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT, allowNull: false },
  date: { type: DataTypes.DATE },
  role: { type: DataTypes.STRING, defaultValue: 'invigilator' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_exam_duties',
  timestamps: false,
});

module.exports = ExamDuty;
