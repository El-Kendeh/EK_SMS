#!/bin/bash
# clean-schools-data.sh
# Delete all existing schools, school admins, and related data for fresh start

echo "⚠️  WARNING: This will delete ALL schools, school admins, and related data."
echo "This action cannot be undone!"
read -p "Are you sure? Type 'yes' to confirm: " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled."
  exit 0
fi

# Connect to database and delete
mysql -u "$DB_USER" -p"$DB_PASSWORD" -h "$DB_HOST" "$DB_NAME" << EOF
-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- Delete from related tables
DELETE FROM school_admins;
DELETE FROM schools;
DELETE FROM users WHERE role_id IN (
  SELECT id FROM roles WHERE code = 'schooladmin'
);

-- Reset auto-increment
ALTER TABLE schools AUTO_INCREMENT = 1;
ALTER TABLE school_admins AUTO_INCREMENT = 1;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

SELECT 'Schools data cleaned successfully!' as status;
EOF

echo "✓ Database cleaned. Ready for fresh registrations."
