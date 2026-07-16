#!/usr/bin/env node
/**
 * Real database backup — a portable, dependency-free logical dump.
 *
 * Why not mysqldump: the binary isn't guaranteed on the host (it's absent on
 * the dev box and on slim Node deploy images), so shelling out to it doesn't
 * hold everywhere the app runs. This dumps over the mysql2 connection the app
 * already uses, so it works in every environment the backend does.
 *
 * Output: backups/eksms-backup-<ISO>.sql.gz  (gzip, FK checks disabled while
 * restoring, DROP+CREATE+INSERT per table). Restore with:
 *   gunzip -c backups/<file>.sql.gz | mysql -u<user> -p <db>
 *
 * ponytail: naive full-table SELECT * held in memory, one INSERT per row.
 * Fine at pilot scale. Ceiling: large tables. Upgrade path when a table grows
 * past ~1e6 rows — stream rows in batches, or switch to the DB provider's
 * native snapshot/PITR (Render/managed MySQL) and keep this as the portable
 * fallback.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const mysql = require('mysql2/promise');

const KEEP = parseInt(process.env.BACKUP_KEEP || '14', 10); // retained backups
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '../backups');

// SQL literal for one column value. JSON columns come back from mysql2 as
// PARSED objects/arrays — mysql.escape() on a raw object emits `key` = val
// (valid in SET, garbage inside VALUES), so stringify those first. Buffers
// (BLOB) and Dates escape natively to X'..' / 'YYYY-..'.
function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (Buffer.isBuffer(v) || v instanceof Date) return mysql.escape(v);
  if (typeof v === 'object') return mysql.escape(JSON.stringify(v));
  return mysql.escape(v);
}

function connConfig() {
  const cfg = { user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '' };
  if (process.env.DB_SOCKET_PATH) cfg.socketPath = process.env.DB_SOCKET_PATH;
  else { cfg.host = process.env.DB_HOST || 'localhost'; cfg.port = process.env.DB_PORT || 3306; }
  cfg.database = process.env.DB_NAME || 'pruh_db';
  cfg.multipleStatements = false;
  return cfg;
}

async function dumpSql(conn, dbName) {
  const lines = [
    `-- EK-SMS backup of \`${dbName}\` @ ${new Date().toISOString()}`,
    'SET FOREIGN_KEY_CHECKS=0;',
    'SET NAMES utf8mb4;',
    '',
  ];
  const [tables] = await conn.query('SHOW FULL TABLES WHERE Table_type = "BASE TABLE"');
  for (const row of tables) {
    const table = Object.values(row)[0];
    const [[create]] = await conn.query(`SHOW CREATE TABLE \`${table}\``);
    const ddl = create['Create Table'];
    lines.push(`DROP TABLE IF EXISTS \`${table}\`;`, `${ddl};`, '');

    const [rows] = await conn.query(`SELECT * FROM \`${table}\``);
    if (rows.length) {
      const cols = Object.keys(rows[0]).map(c => `\`${c}\``).join(', ');
      for (const r of rows) {
        const vals = Object.values(r).map(sqlValue).join(', ');
        lines.push(`INSERT INTO \`${table}\` (${cols}) VALUES (${vals});`);
      }
      lines.push('');
    }
  }
  lines.push('SET FOREIGN_KEY_CHECKS=1;', '');
  return lines.join('\n');
}

function rotate(dir, keep) {
  const files = fs.readdirSync(dir)
    .filter(f => f.startsWith('eksms-backup-') && f.endsWith('.sql.gz'))
    .sort(); // ISO timestamp in name → lexical sort == chronological
  const stale = files.slice(0, Math.max(0, files.length - keep));
  for (const f of stale) fs.unlinkSync(path.join(dir, f));
  return stale.length;
}

async function runBackup() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const conn = await mysql.createConnection(connConfig());
  try {
    const sql = await dumpSql(conn, process.env.DB_NAME || 'pruh_db');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `eksms-backup-${stamp}.sql.gz`;
    const filePath = path.join(BACKUP_DIR, filename);
    const gz = zlib.gzipSync(Buffer.from(sql, 'utf8'));
    fs.writeFileSync(filePath, gz);
    const pruned = rotate(BACKUP_DIR, KEEP);
    return { filename, path: filePath, size_bytes: gz.length, tables_pruned: pruned };
  } finally {
    await conn.end();
  }
}

module.exports = { runBackup, sqlValue };

if (require.main === module) {
  runBackup()
    .then(r => { console.log(`✅ Backup written: ${r.filename} (${r.size_bytes} bytes); pruned ${r.tables_pruned} old`); process.exit(0); })
    .catch(err => { console.error('❌ Backup failed:', err.message); process.exit(1); });
}
