const db = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 3000;

console.log('DB_NAME:', process.env.DB_NAME);
if (process.env.RESEND_API_KEY) {
  const masked = process.env.RESEND_API_KEY.substring(0, 5) + '...';
  console.log('RESEND_API_KEY: Loaded (' + masked + ')');
} else {
  console.log('RESEND_API_KEY: NOT LOADED');
}

Promise.resolve(db.databaseReady)
  .then(() => db.sync({ alter: !!process.env.DB_SYNC_ALTER }))
  .then(() => console.log('Database synchronized'))
  .catch(err => {
    console.error('Database sync failed:', err.message);
    console.warn('Continuing without sync — ensure schema is up to date manually.');
  })
  .finally(() => app.listen(PORT, () => {
    console.log('Backend listening on http://localhost:' + PORT);
  }));
