const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const StudyGroupMember = sequelize.define('StudyGroupMember', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  study_group_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  role: { type: DataTypes.STRING(50), defaultValue: 'member' },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_study_group_member',
  timestamps: false,
});

module.exports = StudyGroupMember;
