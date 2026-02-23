"""
Signals for grade audit trail and change detection.
Handles event sourcing, audit logging, and change alerts.
"""

from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
import json
import hashlib

from .models import Grade, GradeAuditLog, GradeChangeAlert, GradeVerification


# Store original values before save
_original_values = {}


@receiver(pre_save, sender=Grade)
def capture_original_values(sender, instance, **kwargs):
    """Capture original values before save for audit trail"""
    try:
        original = Grade.objects.get(pk=instance.pk)
        _original_values[instance.pk] = {
            'continuous_assessment': float(original.continuous_assessment),
            'mid_term_exam': float(original.mid_term_exam),
            'final_exam': float(original.final_exam),
            'total_score': float(original.total_score),
            'grade_letter': original.grade_letter,
            'is_locked': original.is_locked,
        }
    except Grade.DoesNotExist:
        _original_values[instance.pk] = None


@receiver(post_save, sender=Grade)
def log_grade_changes(sender, instance, created, **kwargs):
    """Log all grade changes to audit trail"""
    from .utils import compute_record_hash, compute_merkle_hash
    
    # Determine action
    if created:
        action = 'CREATE'
        old_values = None
    else:
        # Check what changed
        original = _original_values.get(instance.pk)
        if not original:
            return
        
        old_values = original
        
        # Check if locked grade is being edited
        if original['is_locked'] and instance.is_locked:
            # Locked grade trying to be modified
            if (original['continuous_assessment'] != float(instance.continuous_assessment) or
                original['mid_term_exam'] != float(instance.mid_term_exam) or
                original['final_exam'] != float(instance.final_exam)):
                raise ValueError("Cannot modify a locked grade")
        
        action = 'UPDATE'
    
    # New values
    new_values = {
        'continuous_assessment': float(instance.continuous_assessment),
        'mid_term_exam': float(instance.mid_term_exam),
        'final_exam': float(instance.final_exam),
        'total_score': float(instance.total_score),
        'grade_letter': instance.grade_letter,
        'is_locked': instance.is_locked,
    }
    
    # Compute hashes
    record_hash = compute_record_hash(instance, action, old_values, new_values)
    
    # Get previous audit log for merkle chain
    previous_log = GradeAuditLog.objects.filter(grade=instance).order_by('-logged_at').first()
    if previous_log:
        merkle_hash = compute_merkle_hash(record_hash, previous_log.merkle_hash)
    else:
        merkle_hash = compute_merkle_hash(record_hash, '')
    
    # Create audit log
    audit_log = GradeAuditLog.objects.create(
        grade=instance,
        action=action,
        actor=getattr(instance, '_audit_actor', None),
        old_values=old_values,
        new_values=new_values,
        ip_address=getattr(instance, '_audit_ip', None),
        user_agent=getattr(instance, '_audit_user_agent', None),
        change_reason=getattr(instance, '_change_reason', ''),
        record_hash=record_hash,
        merkle_hash=merkle_hash,
    )
    
    # Create verification record on creation
    if created and action == 'CREATE':
        verification = GradeVerification.objects.create(
            grade=instance,
            expires_at=timezone.now() + timezone.timedelta(days=365 * 4),  # 4 years
            issued_by=getattr(instance, '_audit_actor', None),
        )
        verification.generate_verification_token()
        verification.sha256_hash = record_hash
        verification.save()
    
    # Clean up
    if instance.pk in _original_values:
        del _original_values[instance.pk]


@receiver(post_save, sender=Grade)
def detect_suspicious_changes(sender, instance, created, **kwargs):
    """Detect and alert on suspicious grade changes"""
    if created:
        return  # New grades are not suspicious
    
    original = _original_values.get(instance.pk)
    if not original:
        return
    
    actor = getattr(instance, '_audit_actor', None)
    ip_address = getattr(instance, '_audit_ip', None)
    
    # Check for locked grade edit attempts
    if original['is_locked'] and not instance.is_locked:
        # Someone unlocked a grade
        alert = GradeChangeAlert.objects.create(
            grade=instance,
            severity='CRITICAL',
            alert_type='locked_grade_unlocked',
            description=f'A locked grade was unlocked. This is unusual and may indicate tampering.',
            triggered_by=actor,
            ip_address=ip_address,
            old_value={'is_locked': True},
            new_value={'is_locked': False},
        )
        send_grade_alert_email(alert, [settings.ADMINS[0][1], instance.teacher.user.email if instance.teacher else None])
    
    # Check for score changes of 10+ points
    score_change = abs(float(instance.total_score) - original['total_score'])
    if score_change >= 10:
        alert = GradeChangeAlert.objects.create(
            grade=instance,
            severity='HIGH',
            alert_type='significant_score_change',
            description=f'Score changed by {score_change} points (from {original["total_score"]} to {instance.total_score}). This is a significant change.',
            triggered_by=actor,
            ip_address=ip_address,
            old_value={'total_score': float(original['total_score'])},
            new_value={'total_score': float(instance.total_score)},
        )
        send_grade_alert_email(alert, [settings.ADMINS[0][1]])
    
    # Check for grade letter change (fail->pass or pass->fail)
    if original['grade_letter'] != instance.grade_letter:
        alert = GradeChangeAlert.objects.create(
            grade=instance,
            severity='HIGH',
            alert_type='grade_letter_changed',
            description=f'Grade letter changed from {original["grade_letter"]} to {instance.grade_letter}.',
            triggered_by=actor,
            ip_address=ip_address,
            old_value={'grade_letter': original['grade_letter']},
            new_value={'grade_letter': instance.grade_letter},
        )
        send_grade_alert_email(alert, [settings.ADMINS[0][1]])


def send_grade_alert_email(alert, recipients):
    """Send email notification about grade alert"""
    recipients = [r for r in recipients if r]  # Filter None values
    if not recipients:
        return
    
    subject = f'[ALERT] Suspicious Grade Change: {alert.get_severity_display()}'
    
    message = f"""
Grade Change Alert

Type: {alert.alert_type}
Severity: {alert.get_severity_display()}
Description: {alert.description}

Grade: {alert.grade.student} - {alert.grade.subject}
Changed by: {alert.triggered_by}
At: {alert.triggered_at}
IP Address: {alert.ip_address}

Previous: {alert.old_value}
New: {alert.new_value}

Please verify this change in the admin dashboard.
"""
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            recipients,
            fail_silently=True,
        )
        
        # Update alert with email sent status
        alert.email_sent = True
        alert.email_sent_to = ', '.join(recipients)
        alert.email_sent_at = timezone.now()
        alert.save()
    except Exception as e:
        print(f'Failed to send alert email: {str(e)}')
