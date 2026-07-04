const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const School = require('./School');

const SchoolAdmin = sequelize.define('SchoolAdmin', {
  user_id: {
    type: DataTypes.BIGINT,
    references: { model: User, key: 'id' },
    unique: true
  },
  school_id: {
    type: DataTypes.BIGINT,
    references: { model: School, key: 'id' }
  },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Leadership-team display fields. NULLable by design: the real school_admin
  // link row must not be mislabeled "Principal" (readers fall back per-row).
  role: { type: DataTypes.STRING(50), allowNull: true },
  access_level: { type: DataTypes.STRING(20), allowNull: true },
  // Mirrors User.is_active for display; User.is_active is the real access gate.
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, {
  tableName: 'pruh_core_schooladmin',
  timestamps: false,
});

module.exports = SchoolAdmin;
