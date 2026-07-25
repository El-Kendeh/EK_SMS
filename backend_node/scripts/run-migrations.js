const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'pruh_db',
    port: process.env.DB_PORT || 3306,
    multipleStatements: true,
  });

  const migrationsDir = path.join(__dirname, '../migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`Running migration: ${file}`);
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await connection.query(sql);
      console.log(`  OK`);
    } catch (err) {
      console.error(`  FAILED: ${err.message}`);
    }
  }

  await connection.end();
  console.log('Migrations complete.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
