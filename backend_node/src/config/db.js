// src/config/db.js
require('dotenv').config();
const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');

const dbName = process.env.DB_NAME || 'eksms_db';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD || '';
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || 3306;

async function ensureDatabaseExists() {
  try {
    const connection = await mysql.createConnection({
      host: dbHost,
      port: dbPort,
      user: dbUser,
      password: dbPassword,
    });
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();
    console.log(`✅ Database "${dbName}" verified/created.`);
  } catch (err) {
    console.error('❌ Error ensuring database exists:', err.message);
    // Continue anyway, maybe the user doesn't have permissions to create DBs
  }
}

// Pre-connection check
ensureDatabaseExists();

const sequelize = new Sequelize(dbName, dbUser, dbPassword, {
  host: dbHost,
  port: dbPort,
  dialect: 'mysql',
  logging: false,
});

module.exports = sequelize;
