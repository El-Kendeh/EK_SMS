const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DonationCampaign = sequelize.define('DonationCampaign', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  title: { type: DataTypes.STRING(255) },
  description: { type: DataTypes.TEXT },
  target_amount: { type: DataTypes.FLOAT },
  current_amount: { type: DataTypes.FLOAT, defaultValue: 0 },
  start_date: { type: DataTypes.DATE },
  end_date: { type: DataTypes.DATE },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_donation_campaign',
  timestamps: false,
});

module.exports = DonationCampaign;
