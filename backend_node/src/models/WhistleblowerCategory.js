const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const WhistleblowerCategory = sequelize.define('WhistleblowerCategory', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_whistleblower_category',
  timestamps: false,
});

module.exports = WhistleblowerCategory;
