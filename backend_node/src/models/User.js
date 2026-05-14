const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  username: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING },
  first_name: { type: DataTypes.STRING },
  last_name: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: false }, // Schools need approval
  is_staff: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_superuser: { type: DataTypes.BOOLEAN, defaultValue: false },
  date_joined: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  last_login: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'auth_user',
  timestamps: false,
});

module.exports = User;
