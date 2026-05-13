const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SuperadminSettings = sequelize.define('SuperadminSettings', {
  id: { type: DataTypes.INTEGER, primaryKey: true, defaultValue: 1 },
  settings_json: { type: DataTypes.TEXT, allowNull: true },
}, {
  tableName: 'sa_superadmin_settings',
  timestamps: false,
});

module.exports = SuperadminSettings;
