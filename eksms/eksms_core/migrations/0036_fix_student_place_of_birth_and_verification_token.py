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
        # Add all missing extended fields from 0029 that weren't applied
        migrations.AddField(model_name='student', name='place_of_birth',
            field=models.CharField(blank=True, max_length=200), preserve_default=False),
        migrations.AddField(model_name='student', name='nationality',
            field=models.CharField(blank=True, max_length=100), preserve_default=False),
        migrations.AddField(model_name='student', name='religion',
            field=models.CharField(blank=True, max_length=100), preserve_default=False),
        migrations.AddField(model_name='student', name='home_address',
            field=models.TextField(blank=True), preserve_default=False),
        migrations.AddField(model_name='student', name='city',
            field=models.CharField(blank=True, max_length=100), preserve_default=False),
        migrations.AddField(model_name='student', name='previous_school',
            field=models.CharField(blank=True, max_length=200), preserve_default=False),
        migrations.AddField(model_name='student', name='last_class_completed',
            field=models.CharField(blank=True, max_length=100), preserve_default=False),
        migrations.AddField(model_name='student', name='leaving_reason',
            field=models.TextField(blank=True), preserve_default=False),
        migrations.AddField(model_name='student', name='emergency_name',
            field=models.CharField(blank=True, max_length=200), preserve_default=False),
        migrations.AddField(model_name='student', name='emergency_relationship',
            field=models.CharField(blank=True, max_length=100), preserve_default=False),
        migrations.AddField(model_name='student', name='emergency_phone',
            field=models.CharField(blank=True, max_length=20), preserve_default=False),
        migrations.AddField(model_name='student', name='emergency_address',
            field=models.TextField(blank=True), preserve_default=False),
        migrations.AddField(model_name='student', name='doctor_name',
            field=models.CharField(blank=True, max_length=200), preserve_default=False),
        migrations.AddField(model_name='student', name='doctor_phone',
            field=models.CharField(blank=True, max_length=20), preserve_default=False),
        migrations.AddField(model_name='student', name='documents_birth_certificate',
            field=models.BooleanField(default=False)),
        migrations.AddField(model_name='student', name='documents_passport_photo',
            field=models.BooleanField(default=False)),
        migrations.AddField(model_name='student', name='documents_previous_school_report',
            field=models.BooleanField(default=False)),
        migrations.AddField(model_name='student', name='documents_transfer_letter',
            field=models.BooleanField(default=False)),
        migrations.AddField(model_name='student', name='documents_medical_report',
            field=models.BooleanField(default=False)),
        migrations.AddField(model_name='student', name='documents_other',
            field=models.BooleanField(default=False)),
    ]
