const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const BehaviourIncident = sequelize.define('BehaviourIncident', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  reported_by: { type: DataTypes.BIGINT },
  incident_type: { type: DataTypes.STRING(100) },
  title: { type: DataTypes.STRING(255) },
  severity: { type: DataTypes.STRING(50) },
  description: { type: DataTypes.TEXT },
  // JSON array of uploaded evidence file URLs.
  evidence: { type: DataTypes.TEXT },
  action_taken: { type: DataTypes.TEXT },
  follow_up_required: { type: DataTypes.BOOLEAN, defaultValue: false },
  follow_up_date: { type: DataTypes.DATE },
  parent_notified: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_behaviour_incident',
  timestamps: false,
});

module.exports = BehaviourIncident;
