import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('eksms_core', '0012_otp_record'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # --- School: add rejection_reason and approval_date ---
        migrations.AddField(
            model_name='school',
            name='rejection_reason',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Reason provided when rejecting a school application',
            ),
        ),
        migrations.AddField(
            model_name='school',
            name='approval_date',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='When the school was approved by a superadmin',
            ),
        ),

        # --- SchoolApplicationEvent ---
        migrations.CreateModel(
            name='SchoolApplicationEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(
                    choices=[
                        ('SUBMITTED', 'Application Submitted'),
                        ('UNDER_REVIEW', 'Under Review'),
                        ('APPROVED', 'Application Approved'),
                        ('REJECTED', 'Application Rejected'),
                        ('CHANGES_REQUESTED', 'Changes Requested'),
                        ('RESUBMITTED', 'Application Resubmitted'),
                        ('NOTE', 'Admin Note'),
                    ],
                    db_index=True,
                    max_length=30,
                )),
                ('actor_label', models.CharField(blank=True, max_length=255, help_text='Display label for the actor')),
                ('note', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('school', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='application_events',
                    to='eksms_core.school',
                )),
                ('actor', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='school_application_events',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'School Application Event',
                'verbose_name_plural': 'School Application Events',
                'ordering': ['-created_at'],
            },
        ),

        # --- ForensicEvent ---
        migrations.CreateModel(
            name='ForensicEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(
                    choices=[
                        ('auth_failure', 'Auth Failure'),
                        ('brute_force', 'Brute Force'),
                        ('suspicious_access', 'Suspicious Access'),
                        ('data_export', 'Data Export'),
                        ('privilege_escalation', 'Privilege Escalation'),
                        ('grade_tampering', 'Grade Tampering'),
                        ('unauthorized_api', 'Unauthorized API Call'),
                        ('other', 'Other'),
                    ],
                    db_index=True,
                    max_length=50,
                )),
                ('severity', models.CharField(
                    choices=[
                        ('low', 'Low'),
                        ('medium', 'Medium'),
                        ('high', 'High'),
                        ('critical', 'Critical'),
                    ],
                    db_index=True,
                    max_length=20,
                )),
                ('actor_label', models.CharField(blank=True, max_length=255, help_text='Display label when actor is anonymous/unknown')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('description', models.TextField()),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('resolved', models.BooleanField(default=False, db_index=True)),
                ('resolved_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='forensic_events',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('school', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='forensic_events',
                    to='eksms_core.school',
                )),
                ('resolved_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='resolved_forensic_events',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Forensic Event',
                'verbose_name_plural': 'Forensic Events',
                'ordering': ['-created_at'],
            },
        ),

        # --- AlertBroadcast ---
        migrations.CreateModel(
            name='AlertBroadcast',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('message', models.TextField()),
                ('severity', models.CharField(
                    choices=[('info', 'Info'), ('warning', 'Warning'), ('critical', 'Critical')],
                    default='info',
                    max_length=20,
                )),
                ('audience', models.CharField(
                    choices=[
                        ('all', 'All Users'),
                        ('school_admins', 'School Admins'),
                        ('superadmins', 'Super Admins'),
                        ('specific_school', 'Specific School'),
                    ],
                    default='all',
                    max_length=30,
                )),
                ('status', models.CharField(
                    choices=[('draft', 'Draft'), ('sent', 'Sent'), ('scheduled', 'Scheduled')],
                    default='draft',
                    max_length=20,
                )),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('target_school', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='broadcasts',
                    to='eksms_core.school',
                )),
                ('sent_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sent_broadcasts',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Alert Broadcast',
                'verbose_name_plural': 'Alert Broadcasts',
                'ordering': ['-created_at'],
            },
        ),

        # --- AdminSetting ---
        migrations.CreateModel(
            name='AdminSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=100)),
                ('value', models.JSONField(blank=True, default=None, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='admin_settings',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Admin Setting',
                'verbose_name_plural': 'Admin Settings',
                'ordering': ['user', 'key'],
                'unique_together': {('user', 'key')},
            },
        ),

        # --- SecurityLogEntry ---
        migrations.CreateModel(
            name='SecurityLogEntry',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('event_type', models.CharField(
                    choices=[
                        ('login_success', 'Login Success'),
                        ('login_failure', 'Login Failure'),
                        ('logout', 'Logout'),
                        ('password_changed', 'Password Changed'),
                        ('permission_changed', 'Permission Changed'),
                        ('school_approved', 'School Approved'),
                        ('school_rejected', 'School Rejected'),
                        ('broadcast_sent', 'Broadcast Sent'),
                        ('suspicious_activity', 'Suspicious Activity'),
                        ('api_rate_limited', 'API Rate Limited'),
                        ('profile_updated', 'Profile Updated'),
                    ],
                    db_index=True,
                    max_length=50,
                )),
                ('actor_label', models.CharField(blank=True, max_length=255, help_text='Display label (email/username) for audit display')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('description', models.TextField(blank=True)),
                ('severity', models.CharField(
                    choices=[
                        ('info', 'Info'),
                        ('low', 'Low'),
                        ('medium', 'Medium'),
                        ('high', 'High'),
                        ('critical', 'Critical'),
                    ],
                    db_index=True,
                    default='info',
                    max_length=20,
                )),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('actor', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='security_log_entries',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Security Log Entry',
                'verbose_name_plural': 'Security Log Entries',
                'ordering': ['-created_at'],
            },
        ),
    ]
