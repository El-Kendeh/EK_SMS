const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OTP = sequelize.define('OTP', {
  email: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING, allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  is_used: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'pruh_core_otp',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

module.exports = OTP;
