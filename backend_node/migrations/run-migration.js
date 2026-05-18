const sequelize = require('../config/db');

async function migrate() {
  console.log('Running migration: finance tables + grade approvals + notification user_id');

  try {
    // 1. Create finance tables
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`pruh_finance_fee_category\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`name\` VARCHAR(255) NOT NULL,
        \`description\` TEXT,
        \`amount\` FLOAT NOT NULL,
        \`frequency\` VARCHAR(50) DEFAULT 'term',
        \`applicable_classes\` TEXT,
        \`is_active\` TINYINT(1) DEFAULT 1,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Table: pruh_finance_fee_category');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`pruh_finance_fee\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`fee_category_id\` BIGINT NOT NULL,
        \`term_id\` BIGINT,
        \`amount\` FLOAT NOT NULL,
        \`discount\` FLOAT DEFAULT 0,
        \`amount_due\` FLOAT NOT NULL,
        \`amount_paid\` FLOAT DEFAULT 0,
        \`status\` VARCHAR(50) DEFAULT 'pending',
        \`due_date\` DATETIME,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Table: pruh_finance_fee');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`pruh_finance_payment\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`student_id\` BIGINT NOT NULL,
        \`fee_id\` BIGINT,
        \`amount\` FLOAT NOT NULL,
        \`payment_method\` VARCHAR(50) DEFAULT 'cash',
        \`reference\` VARCHAR(255),
        \`receipt_number\` VARCHAR(255),
        \`payment_hash\` VARCHAR(255),
        \`status\` VARCHAR(50) DEFAULT 'completed',
        \`notes\` TEXT,
        \`paid_by\` VARCHAR(255),
        \`paid_at\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Table: pruh_finance_payment');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS \`pruh_finance_expense\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        \`school_id\` BIGINT NOT NULL,
        \`category\` VARCHAR(255) NOT NULL,
        \`description\` TEXT NOT NULL,
        \`amount\` FLOAT NOT NULL,
        \`date\` DATETIME DEFAULT CURRENT_TIMESTAMP,
        \`receipt_path\` VARCHAR(500),
        \`approved_by\` BIGINT,
        \`status\` VARCHAR(50) DEFAULT 'approved',
        \`created_at\` DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✓ Table: pruh_finance_expense');

    // 2. Add indexes
    const indexes = [
      ['idx_fee_school', 'pruh_finance_fee', 'school_id'],
      ['idx_fee_student', 'pruh_finance_fee', 'student_id'],
      ['idx_fee_category', 'pruh_finance_fee', 'fee_category_id'],
      ['idx_fee_term', 'pruh_finance_fee', 'term_id'],
      ['idx_payment_school', 'pruh_finance_payment', 'school_id'],
      ['idx_payment_student', 'pruh_finance_payment', 'student_id'],
      ['idx_payment_fee', 'pruh_finance_payment', 'fee_id'],
      ['idx_expense_school', 'pruh_finance_expense', 'school_id'],
      ['idx_fee_category_school', 'pruh_finance_fee_category', 'school_id'],
    ];

    for (const [name, table, column] of indexes) {
      try {
        await sequelize.query(`CREATE INDEX IF NOT EXISTS \`${name}\` ON \`${table}\` (\`${column}\`)`);
        console.log(`✓ Index: ${name}`);
      } catch (e) {
        console.log(`  (index ${name} may already exist)`);
      }
    }

    // 3. Alter existing tables
    const columns = [
      { table: 'pruh_core_grade', column: 'approval_status', def: "VARCHAR(50) DEFAULT 'pending' AFTER `remarks`" },
      { table: 'pruh_core_grade', column: 'approved_by', def: 'BIGINT AFTER `approval_status`' },
      { table: 'pruh_core_grade', column: 'approved_at', def: 'DATETIME AFTER `approved_by`' },
      { table: 'pruh_core_notification', column: 'user_id', def: 'BIGINT AFTER `school_id`' },
    ];

    for (const { table, column, def } of columns) {
      try {
        await sequelize.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${def}`);
        console.log(`✓ Column: ${table}.${column}`);
      } catch (e) {
        if (e.original && e.original.code === 'ER_DUP_FIELDNAME') {
          console.log(`  (column ${table}.${column} already exists)`);
        } else {
          throw e;
        }
      }
    }

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();
