const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

/**
 * A cryptographic, hash-chained receipt produced when a teacher locks a batch of
 * grades. Each receipt records the batch (count + average), a content hash of the
 * locked scores, and links to the previous receipt's hash (prev_hash) at a
 * chain_position — a tamper-evident ledger. verification_hash is the public lookup
 * key (scanned from the receipt QR at /verify/<hash>). Audit #17.
 */
const GradeReceipt = sequelize.define('GradeReceipt', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT },
  subject_id: { type: DataTypes.BIGINT },
  term_id: { type: DataTypes.BIGINT },
  classroom_id: { type: DataTypes.BIGINT },
  count: { type: DataTypes.INTEGER, defaultValue: 0 },
  average: { type: DataTypes.FLOAT },
  content_hash: { type: DataTypes.STRING(64) },
  verification_hash: { type: DataTypes.STRING(64), unique: true },
  prev_hash: { type: DataTypes.STRING(64) },
  chain_position: { type: DataTypes.INTEGER, defaultValue: 1 },
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_grade_receipt',
  timestamps: false,
  indexes: [
    { fields: ['school_id'] },
    { fields: ['verification_hash'] },
  ],
});

module.exports = GradeReceipt;
