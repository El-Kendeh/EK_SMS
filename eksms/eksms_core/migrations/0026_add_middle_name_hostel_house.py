from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0025_add_intake_term_is_repeater_whatsapp'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='middle_name',
            field=models.CharField(blank=True, max_length=100),
        ),
        migrations.AddField(
            model_name='student',
            name='hostel_house',
            field=models.CharField(blank=True, max_length=100),
        ),
    ]
