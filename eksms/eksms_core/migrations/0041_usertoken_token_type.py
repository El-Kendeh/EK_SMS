# Generated migration to add token_type field to UserToken model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0040_ensure_student_columns'),
    ]

    operations = [
        migrations.AddField(
            model_name='usertoken',
            name='token_type',
            field=models.CharField(default='access', help_text='Type of token (access, refresh, etc.)', max_length=50),
        ),
    ]
