const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CoreBursar = sequelize.define('CoreBursar', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
  employee_id: { type: DataTypes.STRING(50), allowNull: false },
  /* Personal */
  date_of_birth: { type: DataTypes.DATEONLY },
  gender: { type: DataTypes.STRING(10) },
  marital_status: { type: DataTypes.STRING(20) },
  nationality: { type: DataTypes.STRING(100) },
  state_of_origin: { type: DataTypes.STRING(100) },
  lga: { type: DataTypes.STRING(100) },
  religion: { type: DataTypes.STRING(100) },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING(100) },
  phone_number: { type: DataTypes.STRING(20) },
  /* Professional */
  qualification: { type: DataTypes.STRING(255) },
  years_experience: { type: DataTypes.INTEGER, defaultValue: 0 },
  hire_date: { type: DataTypes.DATEONLY },
  contract_type: { type: DataTypes.STRING(50) },
  salary_grade: { type: DataTypes.STRING(50) },
  /* Identification */
  national_id_number: { type: DataTypes.STRING(50) },
  /* Bank */
  bank_name: { type: DataTypes.STRING(100) },
  bank_account_number: { type: DataTypes.STRING(30) },
  bank_account_name: { type: DataTypes.STRING(100) },
  /* Emergency */
  emergency_contact_name: { type: DataTypes.STRING(100) },
  emergency_contact_phone: { type: DataTypes.STRING(20) },
  emergency_contact_relationship: { type: DataTypes.STRING(50) },
  /* Other */
  profile_picture: { type: DataTypes.STRING(255) },
  bio: { type: DataTypes.TEXT },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_bursar',
  timestamps: false,
});

module.exports = CoreBursar;
