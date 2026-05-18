const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  assignment_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  submitted_at: { type: DataTypes.DATE },
  content: { type: DataTypes.TEXT },
  attachment_path: { type: DataTypes.STRING(500) },
  score: { type: DataTypes.FLOAT },
  feedback: { type: DataTypes.TEXT },
  status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_assignment_submission',
  timestamps: false,
});

module.exports = AssignmentSubmission;
