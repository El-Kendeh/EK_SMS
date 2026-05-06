from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0035_classroom_curriculum_schedule'),
    ]

    operations = [
        migrations.AlterField(
            model_name='gradeverification',
            name='verification_token',
            field=models.CharField(
                max_length=255,
                unique=True,
                db_index=True,
                help_text='Unique token for verification',
            ),
        ),
        migrations.RunSQL(
            sql="""
                ALTER TABLE eksms_core_student
                ADD COLUMN IF NOT EXISTS place_of_birth VARCHAR(200) NULL;
            """,
            reverse_sql="""
                ALTER TABLE eksms_core_student
                DROP COLUMN IF EXISTS place_of_birth;
            """,
        ),
    ]
