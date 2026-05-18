const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Message = sequelize.define('Message', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  sender_id: { type: DataTypes.BIGINT },
  sender_type: { type: DataTypes.STRING(50) },
  recipient_id: { type: DataTypes.BIGINT },
  recipient_type: { type: DataTypes.STRING(50) },
  subject: { type: DataTypes.STRING(255) },
  body: { type: DataTypes.TEXT },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  thread_id: { type: DataTypes.STRING(100) },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_message',
  timestamps: false,
});

module.exports = Message;
