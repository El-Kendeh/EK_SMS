from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0024_add_student_type_fee_language'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='intake_term',
            field=models.CharField(blank=True, choices=[('TERM1', 'Term 1'), ('TERM2', 'Term 2'), ('TERM3', 'Term 3')], default='', max_length=10),
        ),
        migrations.AddField(
            model_name='student',
            name='is_repeater',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='parent',
            name='whatsapp_number',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
