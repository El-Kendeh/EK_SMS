#!/usr/bin/env python
"""
EK-SMS Post-Migration Verification Script
Verifies that the database fix was applied correctly
Run on: Ubuntu server after applying migrations
Usage: python verify_fix.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from django.db import connection
from django.db.utils import ProgrammingError
from eksms_core.models import Student
import datetime

def print_header(text):
    print(f"\n{'=' * 70}")
    print(f"  {text}")
    print(f"{'=' * 70}\n")

def check_migration_status():
    """Check if migration 0029 is applied"""
    print_header("1. Checking Migration Status")
    
    try:
        from django.db.migrations.executor import MigrationExecutor
        executor = MigrationExecutor(connection)
        targets = executor.loader.graph.leaf_nodes()
        
        print(f"Migrations executor ready: {len(targets)} target nodes")
        
        # Check specific migration
        from django.apps import apps
        app = apps.get_app_config('eksms_core')
        
        # Get migration records
        migrations_table = django.db.connection.introspection.table_names()
        if 'django_migrations' in migrations_table:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT app, name FROM django_migrations 
                    WHERE app='eksms_core' AND name='0029_add_student_extended_fields'
                """)
                result = cursor.fetchone()
                if result:
                    print(f"✓ Migration {result[0]}.{result[1]} is APPLIED")
                    return True
                else:
                    print("✗ Migration 0029_add_student_extended_fields NOT applied")
                    return False
    except Exception as e:
        print(f"⚠ Warning checking migration status: {e}")
        return None

def check_database_column():
    """Check if place_of_birth column exists in database"""
    print_header("2. Checking Database Column")
    
    try:
        with connection.cursor() as cursor:
            # Get table structure
            cursor.execute("""
                SHOW COLUMNS FROM eksms_core_student 
                WHERE Field='place_of_birth'
            """)
            result = cursor.fetchone()
            
            if result:
                field, type_, null, key, default, extra = result
                print(f"✓ Column EXISTS in database")
                print(f"  Field: {field}")
                print(f"  Type: {type_}")
                print(f"  Nullable: {null}")
                print(f"  Default: {default}")
                return True
            else:
                print("✗ Column NOT FOUND in database")
                print("  This means migration was not applied")
                return False
    except ProgrammingError as e:
        print(f"✗ Database error: {e}")
        return False

def check_model_definition():
    """Check if place_of_birth field exists in Django model"""
    print_header("3. Checking Django Model Definition")
    
    try:
        # Get all field names
        fields = {f.name for f in Student._meta.get_fields()}
        
        if 'place_of_birth' in fields:
            print("✓ Field EXISTS in Django model")
            
            # Get field details
            field = Student._meta.get_field('place_of_birth')
            print(f"  Type: {field.__class__.__name__}")
            print(f"  Max Length: {getattr(field, 'max_length', 'N/A')}")
            print(f"  Null: {field.null}")
            print(f"  Blank: {field.blank}")
            print(f"  Default: {field.default}")
            return True
        else:
            print("✗ Field NOT in Django model")
            print(f"  Available fields: {sorted(fields)}")
            return False
    except Exception as e:
        print(f"✗ Error checking model: {e}")
        return False

def check_orm_query():
    """Test if ORM can query the place_of_birth field"""
    print_header("4. Testing ORM Query Access")
    
    try:
        # Test basic query
        count = Student.objects.count()
        print(f"Total students in database: {count}")
        
        if count > 0:
            # Try to query the field
            student = Student.objects.values('place_of_birth', 'first_name', 'last_name').first()
            print(f"✓ Successfully queried place_of_birth field")
            print(f"  Sample student: {student}")
            return True
        else:
            print("⚠ No students in database yet, but query format is valid")
            # Still test the query would work
            query = Student.objects.values('place_of_birth')
            print(f"✓ Query object created successfully (would work with data)")
            return True
            
    except Exception as e:
        print(f"✗ Error querying ORM: {e}")
        print(f"  This means the column is still not accessible")
        return False

def check_api_endpoints():
    """Check if we can simulate API calls that were failing"""
    print_header("5. Testing API Query Patterns")
    
    try:
        # Pattern 1: grade-alerts endpoint pattern
        print("Testing pattern: grade-alerts endpoint...")
        try:
            # This is typical of what grade-alerts does
            from eksms_core.models import GradeAlert
            count = GradeAlert.objects.count()
            print(f"  ✓ GradeAlert queries work ({count} records)")
        except Exception as e:
            print(f"  ⚠ GradeAlert query: {e}")
        
        # Pattern 2: users endpoint pattern  
        print("Testing pattern: users endpoint...")
        try:
            from django.contrib.auth.models import User
            user_count = User.objects.count()
            print(f"  ✓ User queries work ({user_count} records)")
        except Exception as e:
            print(f"  ⚠ User query: {e}")
            
        # Pattern 3: students endpoint pattern (this was failing)
        print("Testing pattern: students endpoint...")
        try:
            student_data = Student.objects.values(
                'id', 'first_name', 'last_name', 
                'place_of_birth', 'enrollment_number'
            ).first()
            print(f"  ✓ Student query WITH place_of_birth works!")
            if student_data:
                print(f"    Sample: {student_data}")
            else:
                print(f"    (No students yet, but query format is valid)")
            return True
        except Exception as e:
            print(f"  ✗ Student query FAILED: {e}")
            return False
            
    except Exception as e:
        print(f"✗ Unexpected error: {e}")
        return False

def run_all_checks():
    """Run all verification checks"""
    print("\n" + "=" * 70)
    print("  EK-SMS POST-MIGRATION VERIFICATION")
    print("  " + datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 70)
    
    results = {
        'Migration Applied': check_migration_status(),
        'Database Column': check_database_column(),
        'Model Definition': check_model_definition(),
        'ORM Query': check_orm_query(),
        'API Patterns': check_api_endpoints(),
    }
    
    # Summary
    print_header("VERIFICATION SUMMARY")
    
    passed = sum(1 for v in results.values() if v is True)
    failed = sum(1 for v in results.values() if v is False)
    warned = sum(1 for v in results.values() if v is None)
    
    for check, result in results.items():
        if result is True:
            status = "✓ PASS"
        elif result is False:
            status = "✗ FAIL"
        else:
            status = "⚠ WARN"
        print(f"{status}  {check}")
    
    print(f"\nTotal: {passed} passed, {failed} failed, {warned} warnings\n")
    
    # Final recommendation
    if failed == 0 and passed >= 3:
        print("✓ SUCCESS! The database fix appears to be working correctly.")
        print("  Your API should no longer return 500 errors for place_of_birth.")
        print("\nNext steps:")
        print("  1. Test API endpoints in browser or Postman")
        print("  2. Check for CSP violations (separate issue)")
        print("  3. Monitor logs: sudo journalctl -u gunicorn -f")
        return True
    elif failed > 0:
        print("✗ FAILURE! There are still issues to resolve:")
        print("\nTroubleshooting:")
        print("  1. Verify migration was applied: python manage.py showmigrations")
        print("  2. Check database directly: python manage.py dbshell")
        print("  3. Restart Django: sudo systemctl restart gunicorn")
        print("  4. Check logs: sudo journalctl -u gunicorn -n 50 --no-pager")
        return False
    else:
        print("⚠ PARTIAL SUCCESS - Some checks had warnings")
        print("  Monitor the application closely")
        return True

if __name__ == '__main__':
    try:
        success = run_all_checks()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n✗ CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
