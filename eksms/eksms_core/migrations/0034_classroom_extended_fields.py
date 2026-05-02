# Adds richer Classes management fields:
# stream, class_teacher, assistant_teachers, subjects, colour_tag, room, notes

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0033_teacher_credentials_liveclass_aicapture'),
    ]

    operations = [
        migrations.AddField(
            model_name='classroom',
            name='stream',
            field=models.CharField(blank=True, default='', max_length=10,
                                   help_text='Section letter or label (e.g. A, B, Sciences)'),
        ),
        migrations.AddField(
            model_name='classroom',
            name='class_teacher',
            field=models.ForeignKey(blank=True, null=True,
                                    on_delete=django.db.models.deletion.SET_NULL,
                                    related_name='homeroom_of',
                                    to='eksms_core.teacher',
                                    help_text='Homeroom / form teacher'),
        ),
        migrations.AddField(
            model_name='classroom',
            name='assistant_teachers',
            field=models.ManyToManyField(blank=True,
                                         related_name='assisted_classes',
                                         to='eksms_core.teacher',
                                         help_text='Co-teachers / assistants'),
        ),
        migrations.AddField(
            model_name='classroom',
            name='subjects',
            field=models.ManyToManyField(blank=True,
                                         related_name='taught_in_classes',
                                         to='eksms_core.subject',
                                         help_text="Subjects in this class's curriculum"),
        ),
        migrations.AddField(
            model_name='classroom',
            name='colour_tag',
            field=models.CharField(default='#3B82F6', max_length=7,
                                   help_text='Hex colour for visual tagging across UI'),
        ),
        migrations.AddField(
            model_name='classroom',
            name='room',
            field=models.CharField(blank=True, default='', max_length=100,
                                   help_text='Physical room (e.g. Block A, Room 12)'),
        ),
        migrations.AddField(
            model_name='classroom',
            name='notes',
            field=models.TextField(blank=True, default='',
                                   help_text='Admin-only memo about this class'),
        ),
    ]
