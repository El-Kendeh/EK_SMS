# Fix MySQL warning by making verification_token a MySQL-compatible CharField
# SHA-256 tokens are 64 characters long, so TextField is not needed.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0041_usertoken_token_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='gradeverification',
            name='verification_token',
            field=models.CharField(max_length=64, unique=True, help_text='Unique token for verification'),
        ),
    ]
