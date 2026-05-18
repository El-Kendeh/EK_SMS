const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ChannelPreference = sequelize.define('ChannelPreference', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
  push: { type: DataTypes.BOOLEAN, defaultValue: true },
  email: { type: DataTypes.BOOLEAN, defaultValue: true },
  sms: { type: DataTypes.BOOLEAN, defaultValue: false },
  in_app: { type: DataTypes.BOOLEAN, defaultValue: true },
  whatsapp: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_channel_preference',
  timestamps: false,
});

module.exports = ChannelPreference;
