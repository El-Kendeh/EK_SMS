const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Room = sequelize.define('Room', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  school_id: { type: DataTypes.BIGINT, allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  code: { type: DataTypes.STRING },
  capacity: { type: DataTypes.INTEGER },
  room_type: { type: DataTypes.STRING }, // Classroom, Lab, Gym, etc.
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_room',
  timestamps: false,
});

module.exports = Room;
