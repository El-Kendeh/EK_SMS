const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const Subject = require('./Subject');
const Teacher = require('./Teacher');

const ClassSubject = sequelize.define('ClassSubject', {
  id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
  class_id: { type: DataTypes.BIGINT, allowNull: false },
  subject_id: { type: DataTypes.BIGINT, allowNull: false },
  teacher_id: { type: DataTypes.BIGINT, allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'pruh_core_class_subject',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['class_id', 'subject_id'] },
  ],
});

ClassSubject.belongsTo(Subject, { foreignKey: 'subject_id' });
ClassSubject.belongsTo(Teacher, { foreignKey: 'teacher_id' });

module.exports = ClassSubject;
