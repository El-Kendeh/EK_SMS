const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Teacher = sequelize.define('Teacher', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  employee_id: { type: DataTypes.STRING(50), allowNull: false },
  phone_number: { type: DataTypes.STRING(20), allowNull: false },
  qualification: { type: DataTypes.STRING(255), allowNull: false },
  hire_date: { type: DataTypes.DATEONLY, allowNull: false },
  is_examination_officer: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  profile_picture: { type: DataTypes.STRING(100) },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  years_experience: { type: DataTypes.INTEGER, defaultValue: 0 },
  bio: { type: DataTypes.TEXT },
  linkedin_url: { type: DataTypes.STRING(200) },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_teacher',
  timestamps: false,
});

const User = require('./User');
Teacher.belongsTo(User, { foreignKey: 'user_id' });
const School = require('./School');
Teacher.belongsTo(School, { foreignKey: 'school_id' });

module.exports = Teacher;
