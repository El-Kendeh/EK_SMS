const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const User = require('./User');
const School = require('./School');

const SchoolAdmin = sequelize.define('SchoolAdmin', {
  user_id: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
    unique: true
  },
  school_id: {
    type: DataTypes.INTEGER,
    references: { model: School, key: 'id' }
  },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
  tableName: 'eksms_core_schooladmin',
  timestamps: false,
});

User.hasOne(SchoolAdmin, { foreignKey: 'user_id' });
SchoolAdmin.belongsTo(User, { foreignKey: 'user_id' });

School.hasMany(SchoolAdmin, { foreignKey: 'school_id' });
SchoolAdmin.belongsTo(School, { foreignKey: 'school_id' });

module.exports = SchoolAdmin;
