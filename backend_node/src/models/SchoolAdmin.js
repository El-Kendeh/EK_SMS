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
}, {
  tableName: 'pruh_core_schooladmin',
  timestamps: false,
});

module.exports = SchoolAdmin;
