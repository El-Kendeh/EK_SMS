const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PermissionSlipSignature = sequelize.define('PermissionSlipSignature', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  slip_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT },
  parent_id: { type: DataTypes.BIGINT },
  signed_at: { type: DataTypes.DATE },
  signature_hash: { type: DataTypes.STRING(255) },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_permission_slip_signature',
  timestamps: false,
});

module.exports = PermissionSlipSignature;
