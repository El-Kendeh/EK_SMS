# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0010_waitlist_email'),
    ]

    operations = [
        migrations.AddField(
            model_name='school',
            name='badge',
            field=models.ImageField(blank=True, help_text='Institution logo/badge', null=True, upload_to='school_badges/'),
        ),
        migrations.AddField(
            model_name='school',
            name='grading_system',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        migrations.AddField(
            model_name='school',
            name='language',
            field=models.CharField(blank=True, default='English', max_length=50),
        ),
        migrations.AddField(
            model_name='school',
            name='registration_number',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='school',
            name='estimated_teachers',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        migrations.AddField(
            model_name='school',
            name='brand_colors',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
        migrations.AddField(
            model_name='school',
            name='established',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
        migrations.AddField(
            model_name='school',
            name='admin_phone',
            field=models.CharField(blank=True, default='', max_length=50),
        ),
    ]
