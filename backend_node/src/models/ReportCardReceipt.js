const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * Verification receipt for a downloaded report card. One row per
 * school+student+term (upserted): the content_hash fingerprints the canonical
 * JSON of the PUBLISHED grade rows at generation time, and verification_hash
 * is the public lookup key printed on the PDF (text + QR → /verify/<hash>).
 * Re-downloading an unchanged report card yields the SAME hash; if the
 * published set changes, the hash rotates and previously printed copies stop
 * verifying — that is the tamper-evidence working as intended.
 */
const ReportCardReceipt = sequelize.define('ReportCardReceipt', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  student_id: { type: DataTypes.BIGINT, allowNull: false },
  term_id: { type: DataTypes.BIGINT, allowNull: false },
  content_hash: { type: DataTypes.STRING(64) },
  verification_hash: { type: DataTypes.STRING(64), unique: true },
  generated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_report_card_receipt',
  timestamps: false,
  indexes: [
    { fields: ['verification_hash'] },
    { fields: ['school_id', 'student_id', 'term_id'] },
  ],
});

module.exports = ReportCardReceipt;
