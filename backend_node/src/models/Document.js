const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Document = sequelize.define('Document', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  title: { type: DataTypes.STRING(255) },
  file_path: { type: DataTypes.STRING(500) },
  file_type: { type: DataTypes.STRING(100) },
  uploaded_by: { type: DataTypes.BIGINT },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_student_document',
  timestamps: false,
});

module.exports = Document;
