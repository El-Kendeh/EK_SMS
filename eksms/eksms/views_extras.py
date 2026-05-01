"""Endpoints added for testing-team feedback round.

Covers:
  * Resend credentials (school admin)
  * Student username self-edit
  * Live classes (CRUD + auto-Jitsi link)
  * AI document capture (Gemini vision/text)
  * Principal dashboard (overview, grade approvals, report-card publish)
  * Teacher extended credentials (degrees, certifications, years_experience)
"""
import json
import secrets
import string

from django.contrib.auth.models import User
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods

from eksms_core.models import (
    AIDocumentCapture, ClassRoom, GradeChangeAlert, LiveClass, ReportCard,
    Student, Subject, Teacher, Term,
)
from .views import (
    _get_authed_user, _log_security_event, _password_strength_ok,
    _send_notification_email,
)


# =========================================================================
# Helpers
# =========================================================================

def _get_user_school(user):
    """Resolve the user's School via whichever profile they have."""
    if not user:
        return None
    for attr in ('school_admin_profile', 'teacher_profile', 'student_profile',
                 'parent_profile', 'school_staff_account'):
        prof = getattr(user, attr, None)
        if prof and getattr(prof, 'school', None):
            return prof.school
    return None


def _is_school_admin(user):
    return bool(user and (user.is_superuser or hasattr(user, 'school_admin_profile')))


def _generate_password(length=14):
    """Generate a random password meeting `_password_strength_ok` rules."""
    upper = string.ascii_uppercase
    lower = string.ascii_lowercase
    digits = string.digits
    special = '!@#$%&*?'
    pool = upper + lower + digits + special
    rng = secrets.SystemRandom()
    while True:
        body = [
            secrets.choice(upper),
            secrets.choice(lower),
            secrets.choice(digits),
            secrets.choice(special),
        ] + [secrets.choice(pool) for _ in range(length - 4)]
        rng.shuffle(body)
        pw = ''.join(body)
        ok, _ = _password_strength_ok(pw)
        if ok:
            return pw


# =========================================================================
# RESEND CREDENTIALS  (school admin → any user in their school)
# =========================================================================

@csrf_exempt
@require_http_methods(['POST'])
def api_resend_credentials(request):
    """Reset a user's password and email new credentials.

    Body: { user_id: int }
    Auth: school admin or superadmin (must share school with target).
    """
    actor = _get_authed_user(request)
    if not _is_school_admin(actor):
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
    user_id = body.get('user_id')
    if not user_id:
        return JsonResponse({'success': False, 'message': 'user_id required'}, status=400)
    try:
        target = User.objects.get(id=user_id)
    except User.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'User not found'}, status=404)

    if not actor.is_superuser:
        actor_school = _get_user_school(actor)
        target_school = _get_user_school(target)
        if not actor_school or actor_school != target_school:
            return JsonResponse({'success': False, 'message': 'Cross-tenant denied'}, status=403)

    if not target.email:
        return JsonResponse({'success': False,
                             'message': 'Target user has no email on file.'}, status=400)

    new_pw = _generate_password()
    target.set_password(new_pw)
    target.save(update_fields=['password'])

    for attr in ('teacher_profile', 'student_profile', 'parent_profile',
                 'school_admin_profile'):
        prof = getattr(target, attr, None)
        if prof and hasattr(prof, 'must_change_password'):
            prof.must_change_password = True
            prof.save(update_fields=['must_change_password'])

    school = _get_user_school(target)
    school_name = school.name if school else 'EK-SMS'
    subject = f"Your {school_name} login credentials have been reset"
    html = f"""
    <p>Hello {target.get_full_name() or target.username},</p>
    <p>Your school administrator has reset your login credentials.</p>
    <p><strong>Username:</strong> {target.username}<br>
       <strong>Temporary password:</strong> {new_pw}</p>
    <p>You will be required to change this password on first login.</p>
    <p>If you did not expect this email, contact your school administrator immediately.</p>
    """
    sent, info = _send_notification_email(subject, target.email, html)
    _log_security_event(
        'credentials_resent',
        f'Credentials resent to {target.username} by {actor.username}',
        severity='medium', actor=actor,
    )
    return JsonResponse({
        'success': True,
        'email_sent': sent,
        'message': 'Credentials reset and emailed.' if sent
                   else f'Credentials reset; email failed: {info}',
    })


# =========================================================================
# STUDENT USERNAME SELF-EDIT
# =========================================================================

@csrf_exempt
@require_http_methods(['POST'])
def api_student_change_username(request):
    """Student edits their own username.

    Body: { new_username: str }
    """
    actor = _get_authed_user(request)
    if not actor or not hasattr(actor, 'student_profile'):
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
    new_username = (body.get('new_username') or '').strip()
    if len(new_username) < 3 or len(new_username) > 30:
        return JsonResponse({'success': False,
                             'message': 'Username must be 3-30 characters.'}, status=400)
    import re as _re
    if not _re.match(r'^[A-Za-z0-9_.@+-]+$', new_username):
        return JsonResponse({'success': False,
                             'message': 'Only letters, numbers, and . _ @ + - allowed.'},
                            status=400)
    if User.objects.filter(username=new_username).exclude(id=actor.id).exists():
        return JsonResponse({'success': False, 'message': 'Username already taken.'}, status=400)
    actor.username = new_username
    actor.save(update_fields=['username'])
    _log_security_event(
        'username_changed',
        f'Student {actor.id} changed username to {new_username}',
        severity='low', actor=actor,
    )
    return JsonResponse({'success': True, 'username': new_username})


# =========================================================================
# LIVE CLASSES
# =========================================================================

def _serialise_live_class(lc):
    return {
        'id': lc.id,
        'title': lc.title,
        'description': lc.description,
        'classroom': {'id': lc.classroom_id, 'name': lc.classroom.name},
        'subject': ({'id': lc.subject_id, 'name': lc.subject.name}
                    if lc.subject_id else None),
        'teacher': {
            'id': lc.teacher_id,
            'name': lc.teacher.user.get_full_name() or lc.teacher.user.username,
        },
        'scheduled_start': lc.scheduled_start.isoformat() if lc.scheduled_start else None,
        'duration_minutes': lc.duration_minutes,
        'meeting_provider': lc.meeting_provider,
        'meeting_url': lc.meeting_url,
        'status': lc.status,
        'created_at': lc.created_at.isoformat(),
    }


def _generate_jitsi_url(school_id, class_id, title):
    slug = ''.join(c for c in (title or '').lower()
                   if c.isalnum() or c == '-') or 'class'
    return f"https://meet.jit.si/eksms-{school_id}-{class_id}-{slug[:30]}"


@csrf_exempt
def api_live_classes(request):
    """GET: list (filtered by role + ?classroom_id, ?teacher_id, ?status, ?upcoming=1)
       POST: create (teacher or school admin)."""
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    school = _get_user_school(actor)
    if not school:
        return JsonResponse({'success': False, 'message': 'No school context'}, status=400)

    if request.method == 'GET':
        qs = LiveClass.objects.filter(school=school).select_related(
            'classroom', 'subject', 'teacher__user')
        if hasattr(actor, 'teacher_profile'):
            qs = qs.filter(teacher=actor.teacher_profile)
        elif hasattr(actor, 'student_profile') and actor.student_profile.classroom_id:
            qs = qs.filter(classroom_id=actor.student_profile.classroom_id)
        elif hasattr(actor, 'parent_profile'):
            child_classroom_ids = list(
                actor.parent_profile.student_links.values_list(
                    'student__classroom_id', flat=True))
            qs = qs.filter(classroom_id__in=[c for c in child_classroom_ids if c])
        classroom_id = request.GET.get('classroom_id')
        if classroom_id:
            qs = qs.filter(classroom_id=classroom_id)
        teacher_id = request.GET.get('teacher_id')
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)
        status_f = request.GET.get('status')
        if status_f:
            qs = qs.filter(status=status_f)
        if request.GET.get('upcoming') == '1':
            qs = qs.filter(scheduled_start__gte=timezone.now())
        return JsonResponse({
            'success': True,
            'live_classes': [_serialise_live_class(lc) for lc in qs[:200]],
        })

    if request.method == 'POST':
        if not (hasattr(actor, 'teacher_profile') or _is_school_admin(actor)):
            return JsonResponse({'success': False, 'message': 'Forbidden'}, status=403)
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        try:
            classroom = ClassRoom.objects.get(id=body['classroom_id'], school=school)
        except (KeyError, ClassRoom.DoesNotExist):
            return JsonResponse({'success': False, 'message': 'Invalid classroom'}, status=400)
        subject = None
        if body.get('subject_id'):
            subject = Subject.objects.filter(id=body['subject_id'], school=school).first()
        if hasattr(actor, 'teacher_profile'):
            teacher = actor.teacher_profile
        else:
            teacher_id = body.get('teacher_id')
            try:
                teacher = Teacher.objects.get(id=teacher_id, school=school)
            except Teacher.DoesNotExist:
                return JsonResponse({'success': False, 'message': 'Invalid teacher'}, status=400)

        title = (body.get('title') or '').strip()[:200]
        if not title:
            return JsonResponse({'success': False, 'message': 'Title required'}, status=400)
        scheduled = body.get('scheduled_start')
        if not scheduled:
            return JsonResponse({'success': False,
                                 'message': 'scheduled_start required'}, status=400)
        from django.utils.dateparse import parse_datetime
        sched_dt = parse_datetime(scheduled)
        if sched_dt is None:
            return JsonResponse({'success': False,
                                 'message': 'Invalid scheduled_start'}, status=400)

        provider = body.get('meeting_provider', 'jitsi')
        meeting_url = (body.get('meeting_url') or '').strip()

        lc = LiveClass.objects.create(
            school=school,
            teacher=teacher,
            classroom=classroom,
            subject=subject,
            title=title,
            description=(body.get('description') or '')[:2000],
            scheduled_start=sched_dt,
            duration_minutes=int(body.get('duration_minutes') or 60),
            meeting_provider=provider,
            meeting_url=meeting_url,
            status='scheduled',
            created_by=actor,
        )
        if provider == 'jitsi' and not meeting_url:
            lc.meeting_url = _generate_jitsi_url(school.id, lc.id, lc.title)
            lc.save(update_fields=['meeting_url'])
        return JsonResponse({'success': True, 'live_class': _serialise_live_class(lc)})

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def api_live_class_detail(request, lc_id):
    """GET / PATCH / DELETE a single live class."""
    actor = _get_authed_user(request)
    if not actor:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    school = _get_user_school(actor)
    try:
        lc = LiveClass.objects.select_related(
            'classroom', 'subject', 'teacher__user'
        ).get(id=lc_id, school=school)
    except LiveClass.DoesNotExist:
        return JsonResponse({'success': False, 'message': 'Not found'}, status=404)

    if request.method == 'GET':
        return JsonResponse({'success': True, 'live_class': _serialise_live_class(lc)})

    can_modify = _is_school_admin(actor) or (
        hasattr(actor, 'teacher_profile')
        and lc.teacher_id == actor.teacher_profile.id
    )
    if not can_modify:
        return JsonResponse({'success': False, 'message': 'Forbidden'}, status=403)

    if request.method == 'PATCH':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        for field in ('title', 'description', 'meeting_url', 'meeting_provider', 'status'):
            if field in body:
                setattr(lc, field, body[field])
        if 'duration_minutes' in body:
            try:
                lc.duration_minutes = int(body['duration_minutes'])
            except (TypeError, ValueError):
                pass
        if 'scheduled_start' in body:
            from django.utils.dateparse import parse_datetime
            dt = parse_datetime(body['scheduled_start'])
            if dt:
                lc.scheduled_start = dt
        lc.save()
        return JsonResponse({'success': True, 'live_class': _serialise_live_class(lc)})

    if request.method == 'DELETE':
        lc.delete()
        return JsonResponse({'success': True})

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


# =========================================================================
# AI DOCUMENT CAPTURE  (Gemini text + vision)
# =========================================================================

def _extract_text_from_upload(field_file):
    """Best-effort text extraction. Returns (text, error_message)."""
    name = (field_file.name or '').lower()
    try:
        field_file.open('rb')
        data = field_file.read()
        field_file.close()
    except Exception as exc:
        return '', str(exc)

    if name.endswith('.pdf'):
        try:
            import io
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(data))
            return ' '.join(p.extract_text() or '' for p in reader.pages), ''
        except Exception as exc:
            return '', f'PDF read failed: {exc}'
    if name.endswith('.docx'):
        try:
            import io
            import docx
            doc = docx.Document(io.BytesIO(data))
            return ' '.join(p.text for p in doc.paragraphs), ''
        except Exception as exc:
            return '', f'DOCX read failed: {exc}'
    if name.endswith(('.txt', '.csv')):
        try:
            return data.decode('utf-8', errors='ignore'), ''
        except Exception as exc:
            return '', str(exc)
    return '', ''  # leave to vision model


def _ai_parse_document(file_path, doc_type, raw_text):
    """Call Gemini to extract structured rows. Returns (dict_or_None, error)."""
    import os as _os
    try:
        import google.generativeai as genai
    except ImportError:
        return None, 'google-generativeai not installed'
    api_key = _os.environ.get('GEMINI_API_KEY')
    if not api_key:
        return None, 'GEMINI_API_KEY not configured'
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    schema_hint = {
        'student_roster':  "rows of {first_name, last_name, gender, date_of_birth, classroom, admission_number, parent_email}",
        'teacher_roster':  "rows of {first_name, last_name, employee_id, email, phone, qualification, subject}",
        'grade_sheet':     "rows of {student_name, admission_number, subject, ca, midterm, final, total}",
        'attendance_sheet': "rows of {student_name, admission_number, date, status}",
    }.get(doc_type, 'rows of structured records')

    prompt = (
        f"Extract structured data from this {doc_type.replace('_', ' ')}. "
        f"Return ONLY a JSON object: "
        f"{{\"columns\": [...], \"rows\": [{{...}}, ...]}}. "
        f"Schema: {schema_hint}. Skip header rows. Empty cells = null. "
        "Do not invent data."
    )
    parts = [prompt]
    if raw_text:
        parts.append("Document text:\n" + raw_text[:30000])
    else:
        try:
            with open(file_path, 'rb') as f:
                img_bytes = f.read()
            ext = file_path.rsplit('.', 1)[-1].lower() if '.' in file_path else 'jpg'
            mime = {'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
                    'png': 'image/png', 'webp': 'image/webp'}.get(ext, 'image/jpeg')
            parts.append({'mime_type': mime, 'data': img_bytes})
        except Exception as exc:
            return None, f'image read failed: {exc}'

    try:
        response = model.generate_content(parts)
        text = (response.text or '{}').strip()
        if '```json' in text:
            text = text.split('```json', 1)[1].split('```', 1)[0]
        elif '```' in text:
            text = text.split('```', 1)[1].split('```', 1)[0]
        return json.loads(text.strip()), ''
    except json.JSONDecodeError as exc:
        return None, f'AI returned invalid JSON: {exc}'
    except Exception as exc:
        return None, str(exc)


@csrf_exempt
@require_http_methods(['POST'])
def api_ai_document_capture(request):
    """multipart upload → AI extraction. Body: file, document_type."""
    actor = _get_authed_user(request)
    if not _is_school_admin(actor):
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    school = _get_user_school(actor)
    if not school:
        return JsonResponse({'success': False, 'message': 'No school context'}, status=400)

    file = request.FILES.get('file')
    if not file:
        return JsonResponse({'success': False, 'message': 'file required'}, status=400)
    doc_type = request.POST.get('document_type', 'other')
    valid = {c[0] for c in AIDocumentCapture.DOC_TYPE_CHOICES}
    if doc_type not in valid:
        doc_type = 'other'

    capture = AIDocumentCapture.objects.create(
        school=school,
        uploaded_by=actor,
        document_type=doc_type,
        file=file,
        status='processing',
    )
    raw_text, _err = _extract_text_from_upload(capture.file)
    capture.raw_text = (raw_text or '')[:200000]

    structured, err = _ai_parse_document(capture.file.path, doc_type, raw_text)
    if structured is None:
        capture.status = 'failed'
        capture.error_message = err or 'AI parsing failed'
        capture.save()
        return JsonResponse({'success': False,
                             'message': capture.error_message,
                             'capture_id': capture.id}, status=502)

    capture.structured = structured
    capture.status = 'done'
    capture.processed_at = timezone.now()
    capture.save()
    return JsonResponse({
        'success': True,
        'capture_id': capture.id,
        'document_type': doc_type,
        'structured': structured,
    })


@csrf_exempt
def api_ai_capture_list(request):
    """List recent AI captures for this school."""
    actor = _get_authed_user(request)
    if not _is_school_admin(actor):
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    school = _get_user_school(actor)
    qs = AIDocumentCapture.objects.filter(school=school)[:50]
    return JsonResponse({
        'success': True,
        'captures': [{
            'id': c.id,
            'document_type': c.document_type,
            'status': c.status,
            'created_at': c.created_at.isoformat(),
            'processed_at': c.processed_at.isoformat() if c.processed_at else None,
            'imported_at': c.imported_at.isoformat() if c.imported_at else None,
            'rows': len((c.structured or {}).get('rows', []))
                    if isinstance(c.structured, dict) else 0,
            'error': c.error_message,
        } for c in qs],
    })


# =========================================================================
# PRINCIPAL DASHBOARD
# =========================================================================

def _principal_school(request):
    """(user, school) for an authenticated principal, else (None, None).
    Superadmin can view as principal for testing."""
    user = _get_authed_user(request)
    if not user:
        return None, None
    sa = getattr(user, 'school_staff_account', None)
    if sa and sa.role == 'PRINCIPAL' and sa.is_active:
        return user, sa.school
    if user.is_superuser:
        return user, _get_user_school(user)
    return None, None


@csrf_exempt
def api_principal_overview(request):
    """High-level metrics for the Principal dashboard home."""
    user, school = _principal_school(request)
    if not school:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    students_total = Student.objects.filter(school=school, is_active=True).count()
    teachers_total = Teacher.objects.filter(school=school, is_active=True).count()
    classrooms_total = ClassRoom.objects.filter(school=school, is_active=True).count()

    pending_grade_changes = 0
    try:
        pending_grade_changes = GradeChangeAlert.objects.filter(
            grade__student__school=school,
        ).exclude(severity='low').count()
    except Exception:
        pass

    active_term = Term.objects.filter(
        academic_year__school=school, is_active=True).first()
    report_cards_published = report_cards_pending = 0
    if active_term:
        report_cards_published = ReportCard.objects.filter(
            student__school=school, term=active_term, is_published=True).count()
        report_cards_pending = ReportCard.objects.filter(
            student__school=school, term=active_term, is_published=False).count()

    return JsonResponse({
        'success': True,
        'school': {'id': school.id, 'name': school.name},
        'metrics': {
            'students_total': students_total,
            'teachers_total': teachers_total,
            'classrooms_total': classrooms_total,
            'pending_grade_changes': pending_grade_changes,
            'report_cards_published': report_cards_published,
            'report_cards_pending': report_cards_pending,
            'active_term': active_term.get_name_display() if active_term else None,
        },
    })


@csrf_exempt
def api_principal_grade_approvals(request):
    """GET: pending grade modification requests in this school.
       POST: { mod_id, action: approve|reject, comment }"""
    user, school = _principal_school(request)
    if not school:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    try:
        from eksms_core.models import GradeModificationRequest
    except ImportError:
        return JsonResponse({'success': True, 'requests': []})

    if request.method == 'GET':
        qs = GradeModificationRequest.objects.filter(
            grade__student__school=school
        ).select_related('grade__student__user', 'grade__subject', 'requested_by')[:200]
        return JsonResponse({
            'success': True,
            'requests': [{
                'id': r.id,
                'grade_id': r.grade_id,
                'student': (r.grade.student.user.get_full_name()
                            if r.grade and r.grade.student else None),
                'subject': r.grade.subject.name if r.grade and r.grade.subject else None,
                'old_value': getattr(r, 'old_value', None),
                'new_value': getattr(r, 'new_value', None),
                'reason':    getattr(r, 'reason', ''),
                'status':    getattr(r, 'status', 'pending'),
                'requested_by': r.requested_by.username if r.requested_by_id else None,
                'requested_at': r.created_at.isoformat() if hasattr(r, 'created_at') else None,
            } for r in qs],
        })

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        mod_id = body.get('mod_id')
        action = body.get('action')
        comment = (body.get('comment') or '')[:2000]
        if action not in ('approve', 'reject'):
            return JsonResponse({'success': False,
                                 'message': "action must be 'approve' or 'reject'"},
                                status=400)
        try:
            mod = GradeModificationRequest.objects.get(
                id=mod_id, grade__student__school=school)
        except GradeModificationRequest.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Not found'}, status=404)
        if action == 'approve':
            if hasattr(mod, 'apply_change'):
                mod.apply_change(approved_by=user, comment=comment)
            else:
                mod.status = 'approved'
                if hasattr(mod, 'approved_by'):
                    mod.approved_by = user
                mod.save()
        else:
            mod.status = 'rejected'
            if hasattr(mod, 'rejection_reason'):
                mod.rejection_reason = comment
            mod.save()
        _log_security_event(
            'grade_mod_review',
            f'Principal {user.username} {action}d mod #{mod.id}',
            severity='medium', actor=user,
        )
        return JsonResponse({'success': True, 'status': mod.status})

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


@csrf_exempt
def api_principal_report_cards(request):
    """GET: list report cards for active term.
       POST: { card_id, action: publish, principal_comment? }"""
    user, school = _principal_school(request)
    if not school:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)

    active_term = Term.objects.filter(
        academic_year__school=school, is_active=True).first()

    if request.method == 'GET':
        qs = ReportCard.objects.filter(student__school=school)
        if active_term:
            qs = qs.filter(term=active_term)
        qs = qs.select_related('student__user', 'term', 'academic_year')[:500]
        return JsonResponse({
            'success': True,
            'term': active_term.get_name_display() if active_term else None,
            'report_cards': [{
                'id': r.id,
                'student': r.student.user.get_full_name() if r.student_id else None,
                'admission_number': r.student.admission_number if r.student_id else None,
                'term': r.term.get_name_display() if r.term_id else None,
                'is_published': r.is_published,
                'published_at': r.published_at.isoformat() if r.published_at else None,
                'principal_comment': r.principal_comment,
            } for r in qs],
        })

    if request.method == 'POST':
        try:
            body = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
        card_id = body.get('card_id')
        try:
            card = ReportCard.objects.get(id=card_id, student__school=school)
        except ReportCard.DoesNotExist:
            return JsonResponse({'success': False, 'message': 'Not found'}, status=404)
        if 'principal_comment' in body:
            card.principal_comment = (body['principal_comment'] or '')[:2000]
        if body.get('action') == 'publish':
            card.mark_published(user=user)
        else:
            card.save()
        return JsonResponse({'success': True, 'is_published': card.is_published})

    return JsonResponse({'success': False, 'message': 'Method not allowed'}, status=405)


# =========================================================================
# TEACHER EXTENDED CREDENTIALS
# =========================================================================

@csrf_exempt
@require_http_methods(['GET', 'PATCH'])
def api_teacher_credentials(request):
    """Teacher reads/updates their own degrees, certifications, etc."""
    actor = _get_authed_user(request)
    if not actor or not hasattr(actor, 'teacher_profile'):
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
    teacher = actor.teacher_profile

    if request.method == 'GET':
        return JsonResponse({
            'success': True,
            'qualification':    teacher.qualification,
            'degrees':          teacher.degrees or [],
            'certifications':   teacher.certifications or [],
            'years_experience': teacher.years_experience,
            'bio':              teacher.bio,
            'linkedin_url':     teacher.linkedin_url,
        })

    try:
        body = json.loads(request.body)
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON'}, status=400)
    if 'qualification' in body:
        teacher.qualification = (body['qualification'] or '')[:255]
    if 'degrees' in body and isinstance(body['degrees'], list):
        teacher.degrees = body['degrees'][:20]
    if 'certifications' in body and isinstance(body['certifications'], list):
        teacher.certifications = body['certifications'][:20]
    if 'years_experience' in body:
        try:
            teacher.years_experience = max(0, int(body['years_experience']))
        except (TypeError, ValueError):
            pass
    if 'bio' in body:
        teacher.bio = (body['bio'] or '')[:2000]
    if 'linkedin_url' in body:
        teacher.linkedin_url = (body['linkedin_url'] or '')[:200]
    teacher.save()
    return JsonResponse({'success': True})
