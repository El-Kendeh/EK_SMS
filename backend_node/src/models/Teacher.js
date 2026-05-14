const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Teacher = sequelize.define('Teacher', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  phone_number: { type: DataTypes.STRING(20) },
  employment_type: { type: DataTypes.STRING(50) }, // Full-time, Part-time, Contract
  qualification: { type: DataTypes.TEXT },
  is_examination_officer: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_teacher',
  timestamps: false,
});

const User = require('./User');
Teacher.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Teacher;
