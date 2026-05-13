# Fix MySQL warning: Change verification_token from CharField to TextField
# MySQL doesn't allow unique CharFields with max_length > 255

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0041_usertoken_token_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='gradeverification',
            name='verification_token',
            field=models.TextField(unique=True, db_index=True, help_text='Unique token for verification'),
        ),
    ]
