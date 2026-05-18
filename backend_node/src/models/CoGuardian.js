const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CoGuardian = sequelize.define('CoGuardian', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  guardian_user_id: { type: DataTypes.BIGINT },
  relationship: { type: DataTypes.STRING(100) },
  status: { type: DataTypes.STRING(50), defaultValue: 'pending' },
  invited_at: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_co_guardian',
  timestamps: false,
});

module.exports = CoGuardian;
