const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const School = sequelize.define('School', {
  name: { type: DataTypes.STRING, allowNull: false, unique: true },
  institution_type: { type: DataTypes.STRING },
  address: { type: DataTypes.TEXT },
  city: { type: DataTypes.STRING },
  country: { type: DataTypes.STRING },
  phone: { type: DataTypes.STRING },
  email: { type: DataTypes.STRING },
  capacity: { type: DataTypes.INTEGER },
  brand_colors: { type: DataTypes.TEXT }, // JSON string
  badge_path: { type: DataTypes.STRING },
  is_approved: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  rejection_reason: { type: DataTypes.TEXT, allowNull: true },
  changes_requested: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_school', // Assuming Django app name 'eksms_core'
  timestamps: false,
});

module.exports = School;
