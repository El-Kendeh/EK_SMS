#!/usr/bin/env python
import os
import sys
import django

# Add Django project package path so eksms.settings can be imported from the workspace root.
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), 'eksms'))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from django.db import connection

def check_student_fields():
    """Check if required fields exist in Student model"""
    required_fields = [
        'place_of_birth', 'nationality', 'religion',
        'sen_tier', 'is_critical_medical', 'vaccinations'
    ]

    with connection.cursor() as cursor:
        engine = connection.settings_dict['ENGINE']
        existing_columns = []

        if 'sqlite' in engine:
            cursor.execute("PRAGMA table_info('eksms_core_student')")
            existing_columns = [row[1] for row in cursor.fetchall()]
        else:
            column_list = ", ".join("'%s'" % field for field in required_fields)
            cursor.execute(f"""
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'eksms_core_student'
                AND COLUMN_NAME IN ({column_list})
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]

    print("=== Database Schema Check ===")
    for field in required_fields:
        status = "✓ EXISTS" if field in existing_columns else "✗ MISSING"
        print(f"{field}: {status}")

    missing = [f for f in required_fields if f not in existing_columns]
    if missing:
        print(f"\n❌ MISSING FIELDS: {', '.join(missing)}")
        return False
    else:
        print("\n✅ All required fields exist!")
        return True

if __name__ == '__main__':
    check_student_fields()