const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const School = sequelize.define('School', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  institution_type: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING },
  country: { type: DataTypes.STRING },
  region: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  website: { type: DataTypes.STRING },
  capacity: { type: DataTypes.INTEGER },
  motto: { type: DataTypes.STRING },
  established: { type: DataTypes.STRING(10) },
  registration_number: { type: DataTypes.STRING },
  estimated_teachers: { type: DataTypes.INTEGER },
  academic_system: { type: DataTypes.STRING },
  grading_system: { type: DataTypes.STRING },
  language: { type: DataTypes.STRING(50) },
  brand_colors: { type: DataTypes.TEXT },
  badge_path: { type: DataTypes.STRING },
  is_approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  changes_requested: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Real first-approval timestamp (set by handleSchoolAction's approve branch).
  // Distinct from created_at so "Avg Review" / the Approved date are real, not
  // the registration date. NULL for never-approved or legacy (pre-column) rows.
  approved_at: { type: DataTypes.DATE, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_school',
  timestamps: false,
});

module.exports = School;
