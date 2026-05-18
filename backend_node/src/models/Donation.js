const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Donation = sequelize.define('Donation', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  campaign_id: { type: DataTypes.BIGINT, allowNull: false },
  donor_id: { type: DataTypes.BIGINT },
  amount: { type: DataTypes.FLOAT },
  is_anonymous: { type: DataTypes.BOOLEAN, defaultValue: false },
  receipt_hash: { type: DataTypes.STRING(255) },
  paid_at: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_donation',
  timestamps: false,
});

module.exports = Donation;
