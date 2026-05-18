const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ResourceVisit = sequelize.define('ResourceVisit', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  resource_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  visited_at: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_resource_visit',
  timestamps: false,
});

module.exports = ResourceVisit;
