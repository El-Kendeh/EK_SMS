from django.db import migrations


def ensure_student_columns(apps, schema_editor):
    connection = schema_editor.connection
    cursor = connection.cursor()
    table = apps.get_model('eksms_core', 'Student')._meta.db_table
    vendor = connection.vendor

    desired_columns = [
        ('place_of_birth', "VARCHAR(200) NOT NULL DEFAULT ''"),
        ('nationality', "VARCHAR(100) NOT NULL DEFAULT ''"),
        ('religion', "VARCHAR(100) NOT NULL DEFAULT ''"),
        ('home_address', "TEXT"),
        ('city', "VARCHAR(100) NOT NULL DEFAULT ''"),
        ('previous_school', "VARCHAR(200) NOT NULL DEFAULT ''"),
        ('last_class_completed', "VARCHAR(100) NOT NULL DEFAULT ''"),
        ('leaving_reason', "TEXT"),
        ('emergency_name', "VARCHAR(200) NOT NULL DEFAULT ''"),
        ('emergency_relationship', "VARCHAR(100) NOT NULL DEFAULT ''"),
        ('emergency_phone', "VARCHAR(20) NOT NULL DEFAULT ''"),
        ('emergency_address', "TEXT"),
        ('doctor_name', "VARCHAR(200) NOT NULL DEFAULT ''"),
        ('doctor_phone', "VARCHAR(20) NOT NULL DEFAULT ''"),
        ('documents_birth_certificate', "TINYINT(1) NOT NULL DEFAULT 0"),
        ('documents_passport_photo', "TINYINT(1) NOT NULL DEFAULT 0"),
        ('documents_previous_school_report', "TINYINT(1) NOT NULL DEFAULT 0"),
        ('documents_transfer_letter', "TINYINT(1) NOT NULL DEFAULT 0"),
        ('documents_medical_report', "TINYINT(1) NOT NULL DEFAULT 0"),
        ('documents_other', "TINYINT(1) NOT NULL DEFAULT 0"),
        ('sen_tier', "VARCHAR(20) NOT NULL DEFAULT ''"),
        ('is_critical_medical', "TINYINT(1) NOT NULL DEFAULT 0"),
        ('vaccinations', "JSON"),
    ]

    existing_columns = set()
    if vendor == 'mysql':
        cursor.execute(
            "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s",
            [table],
        )
        existing_columns = {row[0] for row in cursor.fetchall()}
    elif vendor == 'sqlite':
        cursor.execute(f"PRAGMA table_info('{table}')")
        existing_columns = {row[1] for row in cursor.fetchall()}
    else:
        return

    for name, definition in desired_columns:
        if name not in existing_columns:
            if vendor == 'mysql':
                if name in {'home_address', 'leaving_reason', 'emergency_address'}:
                    cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `{name}` TEXT NULL")
                    cursor.execute(f"UPDATE `{table}` SET `{name}` = '' WHERE `{name}` IS NULL")
                    cursor.execute(f"ALTER TABLE `{table}` MODIFY COLUMN `{name}` TEXT NOT NULL")
                elif name == 'vaccinations':
                    cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `{name}` JSON NULL")
                    cursor.execute(f"UPDATE `{table}` SET `{name}` = '{{}}' WHERE `{name}` IS NULL")
                    cursor.execute(f"ALTER TABLE `{table}` MODIFY COLUMN `{name}` JSON NOT NULL")
                else:
                    cursor.execute(f"ALTER TABLE `{table}` ADD COLUMN `{name}` {definition}")
            elif vendor == 'sqlite':
                # SQLite does not support JSON type or NOT NULL without default in some cases.
                if name == 'vaccinations':
                    cursor.execute(f"ALTER TABLE \"{table}\" ADD COLUMN \"{name}\" TEXT DEFAULT '{{}}'")
                elif definition == 'TEXT':
                    cursor.execute(f"ALTER TABLE \"{table}\" ADD COLUMN \"{name}\" TEXT DEFAULT ''")
                else:
                    cursor.execute(f"ALTER TABLE \"{table}\" ADD COLUMN \"{name}\" {definition}")


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0039_merge_20260507_1200'),
    ]

    operations = [
        migrations.RunPython(ensure_student_columns, migrations.RunPython.noop),
    ]
