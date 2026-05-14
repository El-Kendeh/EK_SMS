const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Role = require('./Role');

/** Application users in table `users` (separate from legacy `auth_user`). */
const PortalUser = sequelize.define(
  'PortalUser',
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    username: { type: DataTypes.STRING(191), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    email: { type: DataTypes.STRING(191), allowNull: true, unique: true },
    first_name: { type: DataTypes.STRING(191), allowNull: true },
    last_name: { type: DataTypes.STRING(191), allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: Role, key: 'id' },
    },
    last_login: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

PortalUser.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });
Role.hasMany(PortalUser, { foreignKey: 'role_id', as: 'portalUsers' });

module.exports = PortalUser;
