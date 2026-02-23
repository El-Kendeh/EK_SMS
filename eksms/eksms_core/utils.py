"""
Utility functions for cryptographic hashing and grade verification.
"""

import hashlib
import json
from decimal import Decimal


def compute_record_hash(grade, action, old_values, new_values):
    """
    Compute SHA256 hash of a grade record for integrity verification.
    
    This creates a cryptographic snapshot of the record at a point in time.
    """
    snapshot = {
        'grade_id': grade.id,
        'student_id': grade.student_id,
        'subject_id': grade.subject_id,
        'term_id': grade.term_id,
        'action': action,
        'old_values': old_values,
        'new_values': new_values,
        'timestamp': str(timezone.now()),
    }
    
    # Convert Decimal to float for JSON serialization
    def serialize_decimal(obj):
        if isinstance(obj, Decimal):
            return float(obj)
        raise TypeError
    
    record_json = json.dumps(snapshot, sort_keys=True, default=serialize_decimal)
    record_hash = hashlib.sha256(record_json.encode()).hexdigest()
    
    return record_hash


def compute_merkle_hash(current_hash, previous_merkle):
    """
    Compute Merkle tree hash for chain-of-custody verification.
    
    Creates a cryptographic chain where each record includes a hash of all
    previous records, making it impossible to alter the audit trail.
    """
    merkle_input = current_hash + previous_merkle
    merkle_hash = hashlib.sha256(merkle_input.encode()).hexdigest()
    return merkle_hash


def verify_audit_chain(grade):
    """
    Verify the integrity of the complete audit trail for a grade.
    
    Returns:
        dict: {
            'valid': bool - Whether all records are valid
            'tamper_detected': bool - Whether tampering was detected
            'tampered_records': list - Which records were tampered with
            'message': str - Human-readable result
        }
    """
    from .models import GradeAuditLog
    from django.utils import timezone
    
    audit_logs = GradeAuditLog.objects.filter(grade=grade).order_by('logged_at')
    
    if not audit_logs.exists():
        return {
            'valid': True,
            'tamper_detected': False,
            'tampered_records': [],
            'message': 'No audit history found (fresh grade)'
        }
    
    tampered = []
    merkle_chain = ''
    
    for i, log in enumerate(audit_logs):
        # Verify individual record hash
        recomputed_hash = compute_record_hash(
            grade,
            log.action,
            log.old_values,
            log.new_values
        )
        
        if recomputed_hash != log.record_hash:
            tampered.append({
                'record': i,
                'timestamp': log.logged_at,
                'action': log.action,
                'issue': f'Record hash mismatch: {log.record_hash[:16]}... != {recomputed_hash[:16]}...'
            })
        
        # Verify Merkle chain
        expected_merkle = compute_merkle_hash(log.record_hash, merkle_chain)
        if expected_merkle != log.merkle_hash:
            tampered.append({
                'record': i,
                'timestamp': log.logged_at,
                'action': log.action,
                'issue': f'Merkle hash mismatch: chain broken at this record'
            })
        
        merkle_chain = log.merkle_hash
    
    return {
        'valid': len(tampered) == 0,
        'tamper_detected': len(tampered) > 0,
        'tampered_records': tampered,
        'message': f'Audit chain {"VALID" if not tampered else "TAMPER DETECTED"}. '
                  f'{len(tampered)} record(s) compromised.' if tampered 
                  else f'All {len(audit_logs)} records verified successfully.'
    }


def generate_grade_report(grade):
    """
    Generate a comprehensive grade report including audit history and verification.
    
    Returns: dict with complete grade information and audit trail
    """
    from .models import GradeAuditLog, GradeVerification, GradeChangeAlert
    
    verification_result = verify_audit_chain(grade)
    
    # Get all audit logs
    audit_logs = GradeAuditLog.objects.filter(grade=grade).order_by('logged_at')
    
    audit_history = []
    for log in audit_logs:
        audit_history.append({
            'timestamp': log.logged_at.isoformat(),
            'action': log.get_action_display(),
            'actor': str(log.actor),
            'old_values': log.old_values,
            'new_values': log.new_values,
            'ip_address': log.ip_address,
            'hash_valid': log.is_hash_valid(),
        })
    
    # Get verification
    try:
        verification = GradeVerification.objects.get(grade=grade)
        verification_data = {
            'token': verification.verification_token[:20] + '...',
            'verified': verification.is_verified,
            'valid': verification.is_valid(),
            'issued_at': verification.issued_at.isoformat(),
            'expires_at': verification.expires_at.isoformat(),
            'attempts': verification.verification_attempts,
        }
    except GradeVerification.DoesNotExist:
        verification_data = None
    
    # Get change alerts
    alerts = GradeChangeAlert.objects.filter(grade=grade).order_by('-triggered_at')
    alert_list = []
    for alert in alerts:
        alert_list.append({
            'timestamp': alert.triggered_at.isoformat(),
            'severity': alert.get_severity_display(),
            'type': alert.alert_type,
            'description': alert.description,
            'status': alert.get_status_display(),
        })
    
    return {
        'grade': {
            'student': str(grade.student),
            'subject': str(grade.subject),
            'term': str(grade.term),
            'scores': {
                'continuous_assessment': float(grade.continuous_assessment),
                'mid_term_exam': float(grade.mid_term_exam),
                'final_exam': float(grade.final_exam),
                'total': float(grade.total_score),
            },
            'grade_letter': grade.grade_letter,
            'locked': grade.is_locked,
            'locked_by': str(grade.locked_by) if grade.locked_by else None,
            'locked_at': grade.locked_at.isoformat() if grade.locked_at else None,
        },
        'audit_chain_verification': verification_result,
        'audit_history': audit_history,
        'verification': verification_data,
        'change_alerts': alert_list,
        'total_changes': len(audit_history),
        'total_alerts': len(alert_list),
    }


from django.utils import timezone
