const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const GradingScheme = sequelize.define('GradingScheme', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false, unique: true },
  pass_mark: { type: DataTypes.FLOAT, defaultValue: 40 },
  boundaries: { type: DataTypes.TEXT }, // JSON: {A: 80, B: 70, C: 60, D: 50, E: 40, F: 0}
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'eksms_core_gradingscheme',
  timestamps: false,
});

module.exports = GradingScheme;
