const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Per-teacher quick-reply feedback templates. Previously the list was hardcoded and
// "add template" was a no-op (audit #65).
const FeedbackTemplate = sequelize.define('FeedbackTemplate', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT, allowNull: false },
  label: { type: DataTypes.STRING(120) },
  text: { type: DataTypes.TEXT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_feedback_template',
  timestamps: false,
});

module.exports = FeedbackTemplate;
