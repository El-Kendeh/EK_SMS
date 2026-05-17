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

const Class = require('./Class');
<<<<<<< HEAD
ClassSubject.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
ClassSubject.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
ClassSubject.belongsTo(Teacher, { foreignKey: 'teacher_id' });
=======

ClassSubject.belongsTo(Class, { foreignKey: 'class_id', as: 'class' });
ClassSubject.belongsTo(Subject, { foreignKey: 'subject_id', as: 'subject' });
ClassSubject.belongsTo(Teacher, { foreignKey: 'teacher_id', as: 'teacher' });
>>>>>>> 822da3806a517c3a2c4dc393a8df97da47ac0ad7

module.exports = ClassSubject;
