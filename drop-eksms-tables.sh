#!/bin/bash

# Script to drop all eksms_core tables from pruh_db, keeping only users and roles tables
# Run this on your Ubuntu server before restarting the Node.js backend

DB_NAME="pruh_db"
DB_USER="root"
DB_PASS="elkinson"
DB_HOST="localhost"

echo "🔄 Connecting to MySQL database: $DB_NAME"
echo "📋 Tables to DROP (keeping only users and roles):"

# List all tables except users and roles
TABLES_TO_DROP=$(
mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" -D"$DB_NAME" -e "
SELECT TABLE_NAME
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = '$DB_NAME'
AND TABLE_NAME NOT IN ('users', 'roles')
ORDER BY TABLE_NAME;" 2>/dev/null | tail -n +2
)

if [ -z "$TABLES_TO_DROP" ]; then
    echo "ℹ️  No tables found to drop (only users and roles exist)"
    exit 0
fi

echo "$TABLES_TO_DROP"
echo ""
echo "⚠️  WARNING: This will permanently delete all tables except users and roles!"
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Operation cancelled"
    exit 1
fi

echo "🗑️  Dropping tables..."

# Drop each table
echo "$TABLES_TO_DROP" | while read -r table; do
    if [ ! -z "$table" ]; then
        echo "Dropping table: $table"
        mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" -D"$DB_NAME" -e "DROP TABLE IF EXISTS \`$table\`;" 2>/dev/null
        if [ $? -eq 0 ]; then
            echo "✅ Dropped: $table"
        else
            echo "❌ Failed to drop: $table"
        fi
    fi
done

echo ""
echo "📋 Remaining tables in $DB_NAME:"
mysql -u"$DB_USER" -p"$DB_PASS" -h"$DB_HOST" -D"$DB_NAME" -e "SHOW TABLES;" 2>/dev/null

echo ""
echo "✅ Table cleanup complete!"
echo "🔄 Now restart your Node.js backend to recreate the tables:"
echo "   pm2 restart all --update-env"