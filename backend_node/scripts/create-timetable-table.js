/**
 * One-off: create the pruh_core_timetable_slot table using the project's own
 * Sequelize connection (reads backend_node/.env). Safe to re-run — sync uses
 * CREATE TABLE IF NOT EXISTS. Run: `node scripts/create-timetable-table.js`
 */
const sequelize = require('../src/config/db');
const TimetableSlot = require('../src/models/TimetableSlot');

(async () => {
  try {
    if (sequelize.databaseReady) await sequelize.databaseReady;
    await sequelize.authenticate();
    console.log(`DB OK -> ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);

    await TimetableSlot.sync(); // CREATE TABLE IF NOT EXISTS + indexes

    const [tbl] = await sequelize.query("SHOW TABLES LIKE 'pruh_core_timetable_slot'");
    console.log('Table present:', tbl.length > 0);
    if (tbl.length) {
      const [cols] = await sequelize.query('SHOW COLUMNS FROM `pruh_core_timetable_slot`');
      console.log('Columns:', cols.map(c => `${c.Field}:${c.Type}`).join(', '));
      const [idx] = await sequelize.query('SHOW INDEX FROM `pruh_core_timetable_slot`');
      console.log('Indexes:', [...new Set(idx.map(i => i.Key_name))].join(', '));
    }
    process.exit(0);
  } catch (e) {
    console.error('FAILED:', e.code || '', e.message);
    process.exit(1);
  }
})();
