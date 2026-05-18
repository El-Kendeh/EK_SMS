const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const TranscriptRequest = sequelize.define('TranscriptRequest', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  requested_by: { type: DataTypes.BIGINT },
  status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  requested_at: { type: DataTypes.DATE },
  completed_at: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_transcript_request',
  timestamps: false,
});

module.exports = TranscriptRequest;
