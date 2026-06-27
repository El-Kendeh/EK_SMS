const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PeerReview = sequelize.define('PeerReview', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  reviewer_id: { type: DataTypes.BIGINT },
  reviewee_id: { type: DataTypes.BIGINT },
  category: { type: DataTypes.STRING(100) },
  rating: { type: DataTypes.INTEGER },
  comment: { type: DataTypes.TEXT },
  anonymous: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_peer_review',
  timestamps: false,
});

module.exports = PeerReview;
