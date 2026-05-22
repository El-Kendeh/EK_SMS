const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const CorePrincipal = sequelize.define('CorePrincipal', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: true },
  user_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
  employee_id: { type: DataTypes.STRING(50), allowNull: false },
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
  qualification: { type: DataTypes.STRING(255) },
  years_experience: { type: DataTypes.INTEGER, defaultValue: 0 },
  hire_date: { type: DataTypes.DATEONLY },
  contract_type: { type: DataTypes.STRING(50) },
  salary_grade: { type: DataTypes.STRING(50) },
  national_id_number: { type: DataTypes.STRING(50) },
  bank_name: { type: DataTypes.STRING(100) },
  bank_account_number: { type: DataTypes.STRING(30) },
  bank_account_name: { type: DataTypes.STRING(100) },
  emergency_contact_name: { type: DataTypes.STRING(100) },
  emergency_contact_phone: { type: DataTypes.STRING(20) },
  emergency_contact_relationship: { type: DataTypes.STRING(50) },
  profile_picture: { type: DataTypes.STRING(255) },
  bio: { type: DataTypes.TEXT },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_principal',
  timestamps: false,
});

module.exports = CorePrincipal;
