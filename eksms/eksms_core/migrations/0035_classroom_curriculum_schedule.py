# Adds: education_level, track, start_time, end_time, auto_promotion_target

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0034_classroom_extended_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='classroom',
            name='education_level',
            field=models.CharField(
                blank=True, default='', max_length=10,
                choices=[
                    ('pre_k', 'Pre-Kindergarten'),
                    ('primary', 'Primary'),
                    ('jss', 'Junior Secondary (JSS)'),
                    ('sss', 'Senior Secondary (SSS)'),
                    ('college', 'College / Tertiary'),
                ],
                help_text='Coarse education bucket for filtering / reporting',
            ),
        ),
        migrations.AddField(
            model_name='classroom',
            name='track',
            field=models.CharField(
                blank=True, default='', max_length=12,
                choices=[
                    ('sciences', 'Sciences'),
                    ('arts', 'Arts / Humanities'),
                    ('commerce', 'Commerce / Business'),
                    ('vocational', 'Vocational / Technical'),
                    ('mixed', 'Mixed / General'),
                ],
                help_text='Specialisation track at SSS / college level',
            ),
        ),
        migrations.AddField(
            model_name='classroom',
            name='start_time',
            field=models.TimeField(blank=True, null=True,
                                   help_text='Default daily start time (pre-fills timetable)'),
        ),
        migrations.AddField(
            model_name='classroom',
            name='end_time',
            field=models.TimeField(blank=True, null=True,
                                   help_text='Default daily end time'),
        ),
        migrations.AddField(
            model_name='classroom',
            name='auto_promotion_target',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='promoted_from',
                to='eksms_core.classroom',
                help_text='Class this group promotes into at end of academic year',
            ),
        ),
    ]
