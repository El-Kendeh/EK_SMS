const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Student = sequelize.define('Student', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.INTEGER, allowNull: false },
  admission_number: { type: DataTypes.STRING, unique: true },
  first_name: { type: DataTypes.STRING, allowNull: false },
  last_name: { type: DataTypes.STRING, allowNull: false },
  other_names: { type: DataTypes.STRING },
  date_of_birth: { type: DataTypes.DATE },
  gender: { type: DataTypes.STRING },
  classroom_id: { type: DataTypes.INTEGER },
  academic_year_id: { type: DataTypes.INTEGER },
  photo: { type: DataTypes.STRING },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  parent_name: { type: DataTypes.STRING },
  parent_email: { type: DataTypes.STRING },
  parent_phone: { type: DataTypes.STRING },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_student',
  timestamps: false,
});

module.exports = Student;
