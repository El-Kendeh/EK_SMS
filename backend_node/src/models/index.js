/**
 * Side-effect imports so `sequelize.sync({ alter: true })` creates only the minimal schema.
 */
require('./Role');
require('./User');
