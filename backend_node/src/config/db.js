// src/config/db.js
require('dotenv').config();
const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

const dbName = process.env.DB_NAME || 'pruh_db';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 3306;
const dbSocketPath = process.env.DB_SOCKET_PATH || '';

const connectionConfig = {
  user: dbUser,
  password: dbPassword,
};
if (dbSocketPath) {
  connectionConfig.socketPath = dbSocketPath;
} else {
  connectionConfig.host = dbHost;
  connectionConfig.port = dbPort;
}

async function ensureDatabaseExists() {
  try {
    const connection = await mysql.createConnection(connectionConfig);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();
    console.log(`✅ Database "${dbName}" verified/created.`);
  } catch (err) {
    console.error('❌ Error ensuring database exists:', err.message);
    // Continue anyway, maybe the user doesn't have permissions to create DBs
  }
}

// Pre-connection check. Expose the readiness promise so callers (index.js)
// can await database creation BEFORE running db.sync() — otherwise sync can
// fire before the database exists and fail with "Unknown database".
const databaseReady = ensureDatabaseExists();

const sequelizeConfig = {
  dialect: 'mysql',
  logging: false,
  // Money columns are DECIMAL(12,2); without this mysql2 returns them as
  // STRINGS and every FE `balance - paid` computation turns into NaN/concat.
  dialectOptions: { decimalNumbers: true },
};
if (dbSocketPath) {
  sequelizeConfig.dialectOptions.socketPath = dbSocketPath;
} else {
  sequelizeConfig.host = dbHost;
  sequelizeConfig.port = dbPort;
}

const sequelize = new Sequelize(dbName, dbUser, dbPassword, sequelizeConfig);

// Attach the readiness promise so index.js can `await db.databaseReady`
// before syncing models.
sequelize.databaseReady = databaseReady;

module.exports = sequelize;
