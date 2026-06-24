const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// AI Document Capture — one row per uploaded roster/grade/attendance document that
// Gemini parses into structured rows. Mirrors the simple, timestamp-less model style
// used by Expense/Payment (see models/Expense.js). The capture-history table the
// School Admin "AI Document Capture" page reads via GET /api/school/ai-capture/list/.
const AIDocumentCapture = sequelize.define('AIDocumentCapture', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  // student_roster | teacher_roster | grade_sheet | attendance_sheet | other
  document_type: { type: DataTypes.STRING, allowNull: false, defaultValue: 'other' },
  // processing | done | failed
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'processing' },
  file_name: { type: DataTypes.STRING },
  file_size: { type: DataTypes.INTEGER },
  file_mimetype: { type: DataTypes.STRING },
  rows_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  // JSON-stringified array of extracted row objects (LONGTEXT for multi-page docs)
  extracted_rows: { type: DataTypes.TEXT('long') },
  error: { type: DataTypes.TEXT },
  uploaded_by: { type: DataTypes.BIGINT },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_school_ai_document_capture',
  timestamps: false,
  indexes: [
    { fields: ['school_id', 'created_at'] },
    { fields: ['school_id', 'status'] },
  ],
});

module.exports = AIDocumentCapture;
