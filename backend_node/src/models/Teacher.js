const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Teacher = sequelize.define('Teacher', {
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
  phone_number: { type: DataTypes.STRING(20), allowNull: true },
  /* Professional — optional at creation (matches Principal/Bursar models and
     the createSuperTeacher controller, which treats these as optional). */
  qualification: { type: DataTypes.STRING(255), allowNull: true },
  years_experience: { type: DataTypes.INTEGER, defaultValue: 0 },
  subjects_specialization: { type: DataTypes.TEXT },
  hire_date: { type: DataTypes.DATEONLY, allowNull: true },
  contract_type: { type: DataTypes.STRING(50) },
  salary_grade: { type: DataTypes.STRING(50) },
  is_examination_officer: { type: DataTypes.BOOLEAN, defaultValue: false },
  /* Identification */
  national_id_number: { type: DataTypes.STRING(50) },
  passport_number: { type: DataTypes.STRING(50) },
  /* Bank */
  bank_name: { type: DataTypes.STRING(100) },
  bank_account_number: { type: DataTypes.STRING(30) },
  bank_account_name: { type: DataTypes.STRING(100) },
  /* Emergency */
  emergency_contact_name: { type: DataTypes.STRING(100) },
  emergency_contact_phone: { type: DataTypes.STRING(20) },
  emergency_contact_relationship: { type: DataTypes.STRING(50) },
  /* Next of kin */
  next_of_kin_name: { type: DataTypes.STRING(100) },
  next_of_kin_phone: { type: DataTypes.STRING(20) },
  next_of_kin_relationship: { type: DataTypes.STRING(50) },
  next_of_kin_address: { type: DataTypes.TEXT },
  /* Other */
  profile_picture: { type: DataTypes.STRING(255) },
  bio: { type: DataTypes.TEXT, defaultValue: '' },
  linkedin_url: { type: DataTypes.STRING(200), defaultValue: '' },
  degrees: { type: DataTypes.JSON, defaultValue: [] },
  certifications: { type: DataTypes.JSON, defaultValue: [] },
  must_change_password: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_teacher',
  timestamps: false,
});

module.exports = Teacher;
