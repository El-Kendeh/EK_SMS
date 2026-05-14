const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Student = sequelize.define('Student', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  admission_number: { type: DataTypes.STRING, unique: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  date_of_birth: { type: DataTypes.DATEONLY },
  gender: { type: DataTypes.STRING(10) },
  
  // Enrollment
  classroom_id: { type: DataTypes.INTEGER },
  academic_year_id: { type: DataTypes.INTEGER },
  admission_date: { type: DataTypes.DATEONLY },
  student_type: { type: DataTypes.STRING(20) }, // Day, Boarding
  fee_category: { type: DataTypes.STRING(50) },
  status: { type: DataTypes.STRING(20), defaultValue: 'active' },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },

  // Bio
  place_of_birth: { type: DataTypes.STRING(200) },
  nationality: { type: DataTypes.STRING(100) },
  religion: { type: DataTypes.STRING(100) },
  home_language: { type: DataTypes.STRING(100) },
  
  // Contact
  home_address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING(100) },
  phone_number: { type: DataTypes.STRING(20) },
  
  // Medical & SEN
  blood_type: { type: DataTypes.STRING(5) },
  allergies: { type: DataTypes.TEXT },
  medical_notes: { type: DataTypes.TEXT },
  doctor_name: { type: DataTypes.STRING(100) },
  doctor_phone: { type: DataTypes.STRING(20) },
  is_critical_medical: { type: DataTypes.BOOLEAN, defaultValue: false },
  sen_tier: { type: DataTypes.STRING(20) },
  sen_notes: { type: DataTypes.TEXT },
  sen_iep: { type: DataTypes.BOOLEAN, defaultValue: false },
  
  // Media
  passport_picture: { type: DataTypes.STRING(255) },
  
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_student',
  timestamps: false,
});

const User = require('./User');
Student.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Student;
