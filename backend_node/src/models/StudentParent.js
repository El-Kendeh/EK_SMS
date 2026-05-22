const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudentParent = sequelize.define('StudentParent', {
  student_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true },
  parent_id: { type: DataTypes.BIGINT, allowNull: false, primaryKey: true },
  relationship: { type: DataTypes.STRING(50) },
}, {
  tableName: 'pruh_core_student_parent',
  timestamps: false,
});

module.exports = StudentParent;
