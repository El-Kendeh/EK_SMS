const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PickupPerson = sequelize.define('PickupPerson', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING(255) },
  phone: { type: DataTypes.STRING(50) },
  relationship: { type: DataTypes.STRING(100) },
  // Optional gate-pass expiry + UI tag colour (migration 2026-07-03-pickup-expiry-color.sql).
  expiry: { type: DataTypes.DATEONLY, allowNull: true },
  photo_color: { type: DataTypes.STRING(16), allowNull: true },
  is_authorized: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_pickup_person',
  timestamps: false,
});

module.exports = PickupPerson;
