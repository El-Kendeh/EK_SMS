const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/* Virtual Meetings — scheduled video meetings targeted at an audience
   (parents / staff / students), distinct from LiveClass (a teacher's live
   lesson tied to a class+subject). */
const VirtualMeeting = sequelize.define('VirtualMeeting', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: true },
  audience: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'parents' }, // parents | staffs | students
  title: { type: DataTypes.STRING(255), allowNull: false },
  description: { type: DataTypes.TEXT },
  meeting_url: { type: DataTypes.STRING(500) },
  host: { type: DataTypes.STRING(150) },
  scheduled_at: { type: DataTypes.DATE },
  duration_minutes: { type: DataTypes.INTEGER, defaultValue: 60 },
  status: { type: DataTypes.STRING(20), defaultValue: 'scheduled' }, // scheduled | completed | cancelled
  created_by: { type: DataTypes.BIGINT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_virtual_meeting',
  timestamps: false,
});

module.exports = VirtualMeeting;
