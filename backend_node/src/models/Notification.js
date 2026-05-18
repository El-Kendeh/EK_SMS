const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  user_id: { type: DataTypes.BIGINT, allowNull: true },
  title: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT },
  type: { type: DataTypes.STRING },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_notification',
  timestamps: false,
});

module.exports = Notification;
