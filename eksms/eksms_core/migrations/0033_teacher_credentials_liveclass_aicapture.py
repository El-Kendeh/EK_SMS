# Generated for testing-team feedback round
# Adds: Teacher.degrees, certifications, years_experience, bio, linkedin_url
#       LiveClass model
#       AIDocumentCapture model

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0032_syllabus_lessonplan'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # --- Teacher: extended credential fields ---
        migrations.AddField(
            model_name='teacher',
            name='degrees',
            field=models.JSONField(blank=True, default=list,
                                   help_text='List of {institution, degree, year, field}'),
        ),
        migrations.AddField(
            model_name='teacher',
            name='certifications',
            field=models.JSONField(blank=True, default=list,
                                   help_text='List of {name, issuer, year, expires}'),
        ),
        migrations.AddField(
            model_name='teacher',
            name='years_experience',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='teacher',
            name='bio',
            field=models.TextField(blank=True, help_text='Short professional biography'),
        ),
        migrations.AddField(
            model_name='teacher',
            name='linkedin_url',
            field=models.URLField(blank=True, default=''),
        ),

        # --- LiveClass model ---
        migrations.CreateModel(
            name='LiveClass',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=200)),
                ('description', models.TextField(blank=True)),
                ('scheduled_start', models.DateTimeField()),
                ('duration_minutes', models.PositiveIntegerField(default=60)),
                ('meeting_provider', models.CharField(
                    max_length=10, default='jitsi',
                    choices=[('jitsi', 'Jitsi Meet'), ('meet', 'Google Meet'),
                             ('zoom', 'Zoom'), ('teams', 'Microsoft Teams'),
                             ('other', 'Other')])),
                ('meeting_url', models.URLField(blank=True, max_length=500,
                                                help_text='Auto-generated for jitsi, manual for others')),
                ('status', models.CharField(
                    max_length=10, default='scheduled',
                    choices=[('scheduled', 'Scheduled'), ('live', 'Live now'),
                             ('ended', 'Ended'), ('cancelled', 'Cancelled')])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('classroom', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                                related_name='live_classes', to='eksms_core.classroom')),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                             related_name='live_classes', to='eksms_core.school')),
                ('subject', models.ForeignKey(blank=True, null=True,
                                              on_delete=django.db.models.deletion.SET_NULL,
                                              related_name='live_classes', to='eksms_core.subject')),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                              related_name='live_classes', to='eksms_core.teacher')),
                ('created_by', models.ForeignKey(null=True,
                                                 on_delete=django.db.models.deletion.SET_NULL,
                                                 related_name='created_live_classes',
                                                 to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Live Class',
                'verbose_name_plural': 'Live Classes',
                'ordering': ['-scheduled_start'],
                'indexes': [
                    models.Index(fields=['classroom', '-scheduled_start'],
                                 name='lc_class_start_idx'),
                    models.Index(fields=['teacher', '-scheduled_start'],
                                 name='lc_teach_start_idx'),
                    models.Index(fields=['school', 'status', '-scheduled_start'],
                                 name='lc_school_status_idx'),
                ],
            },
        ),

        # --- AIDocumentCapture model ---
        migrations.CreateModel(
            name='AIDocumentCapture',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('document_type', models.CharField(
                    max_length=20, default='other',
                    choices=[('student_roster', 'Student Roster'),
                             ('teacher_roster', 'Teacher Roster'),
                             ('grade_sheet', 'Grade Sheet'),
                             ('attendance_sheet', 'Attendance Sheet'),
                             ('other', 'Other Document')])),
                ('file', models.FileField(upload_to='ai_captures/')),
                ('raw_text', models.TextField(blank=True,
                                              help_text='OCR/text extracted from file')),
                ('structured', models.JSONField(blank=True, default=dict,
                                                help_text='AI-parsed structured data (rows, fields)')),
                ('status', models.CharField(
                    max_length=12, default='pending',
                    choices=[('pending', 'Pending'), ('processing', 'Processing'),
                             ('done', 'Done'), ('failed', 'Failed'),
                             ('imported', 'Imported')])),
                ('error_message', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('processed_at', models.DateTimeField(blank=True, null=True)),
                ('imported_at', models.DateTimeField(blank=True, null=True)),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,
                                             related_name='ai_document_captures',
                                             to='eksms_core.school')),
                ('uploaded_by', models.ForeignKey(null=True,
                                                  on_delete=django.db.models.deletion.SET_NULL,
                                                  related_name='ai_document_captures',
                                                  to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'AI Document Capture',
                'verbose_name_plural': 'AI Document Captures',
                'ordering': ['-created_at'],
            },
        ),
    ]
