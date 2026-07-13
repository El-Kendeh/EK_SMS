const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Role = require('./Role');

/**
 * Primary account table: MySQL `users` + FK `roles`.
 * JWT / middleware still expose `is_superuser` and `is_staff` as virtuals derived from `role.code`.
 */
const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(191), allowNull: false, unique: true },
    password: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'password_hash',
    },
    email: { type: DataTypes.STRING(191), allowNull: true, unique: true },
    first_name: { type: DataTypes.STRING(191), allowNull: true },
    last_name: { type: DataTypes.STRING(191), allowNull: true },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    // Real TOTP 2FA (SA-46). Secret is base32; recovery codes stored as a JSON
    // array of sha256 hashes (burned on use). See services/twoFactor.js.
    two_factor_enabled: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    two_factor_secret: { type: DataTypes.STRING(64), allowNull: true },
    two_factor_recovery: { type: DataTypes.TEXT, allowNull: true },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Role, key: 'id' },
    },
    last_login: { type: DataTypes.DATE, allowNull: true },
    is_superuser: {
      type: DataTypes.VIRTUAL,
      get() {
        const r = this.get('role') || this.role;
        return !!(r && r.code === 'superadmin');
      },
    },
    is_staff: {
      type: DataTypes.VIRTUAL,
      get() {
        const r = this.get('role') || this.role;
        if (!r) return false;
        return ['superadmin', 'schooladmin', 'principal', 'bursar', 'teacher'].includes(r.code);
      },
    },
    date_joined: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('created_at') || this.createdAt;
      },
    },
  },
  {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    defaultScope: {
      include: [{ model: Role, as: 'role', required: false }],
    },
  }
);

module.exports = User;
