import json
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import google.generativeai as genai
import docx
import PyPDF2
from eksms_core.models import Syllabus, LessonPlan, ClassRoom, Subject
from .views import _get_authed_user

import os

@require_http_methods(["POST"])
@csrf_exempt
def api_syllabus_upload(request):
    user = _get_authed_user(request)
    if not user or getattr(user, 'role', None) not in ['school_admin', 'superadmin'] and not hasattr(user, 'school_admin_profile'):
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
        
    try:
        classroom_id = request.POST.get('classroom_id')
        subject_id = request.POST.get('subject_id')
        file = request.FILES.get('file')
        
        if not all([classroom_id, subject_id, file]):
            return JsonResponse({'success': False, 'message': 'Classroom, Subject and File are required.'}, status=400)
            
        classroom = ClassRoom.objects.get(id=classroom_id)
        subject = Subject.objects.get(id=subject_id)
        school = user.school_admin_profile.school if hasattr(user, 'school_admin_profile') else classroom.school
        
        # Save Syllabus
        syllabus, created = Syllabus.objects.update_or_create(
            classroom=classroom,
            subject=subject,
            school=school,
            defaults={'file': file, 'uploaded_by': user}
        )
        
        # Read file text
        text = ""
        file_path = syllabus.file.path
        ext = os.path.splitext(file_path)[1].lower()
        if ext == '.pdf':
            with open(file_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f)
                text = " ".join([page.extract_text() for page in reader.pages if page.extract_text()])
        elif ext == '.docx':
            doc = docx.Document(file_path)
            text = " ".join([para.text for para in doc.paragraphs])
        else:
            # If plain text or other
            with open(file_path, 'r', encoding='utf-8') as f:
                text = f.read()

        # Call AI to generate lesson plan
        genai.configure(api_key=os.environ.get('GEMINI_API_KEY'))
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = f"Based on the following syllabus for {subject.name} (Class: {classroom.name}), generate a weekly lesson plan. Return it as a JSON array where each object has 'week_number' (integer) and 'content' (string describing the lesson plan for that week).\n\nSyllabus:\n{text}"
        response = model.generate_content(prompt)
        
        # Parse JSON
        resp_text = response.text
        if "```json" in resp_text:
            resp_text = resp_text.split("```json")[1].split("```")[0]
        elif "```" in resp_text:
            resp_text = resp_text.split("```")[1].split("```")[0]
            
        try:
            plans = json.loads(resp_text)
            
            # Clear old plans
            LessonPlan.objects.filter(syllabus=syllabus).delete()
            
            # Save new plans
            for plan in plans:
                LessonPlan.objects.create(
                    syllabus=syllabus,
                    week_number=plan.get('week_number', 1),
                    content=plan.get('content', '')
                )
                
            return JsonResponse({'success': True, 'message': 'Syllabus uploaded and lesson plans generated.'})
        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': 'Failed to parse AI response.', 'raw': response.text}, status=500)
            
    except Exception as e:
        return JsonResponse({'success': False, 'message': str(e)}, status=500)

@require_http_methods(["GET"])
@csrf_exempt
def api_syllabus_list(request):
    user = _get_authed_user(request)
    if not user:
        return JsonResponse({'success': False, 'message': 'Unauthorized'}, status=401)
        
    school = getattr(user, 'school_admin_profile', None)
    if school:
        school = school.school
    else:
        # Fallback
        school = getattr(user, 'teacher_profile', None)
        if school: school = school.school
        
    if not school:
        return JsonResponse({'success': False, 'message': 'School not found.'}, status=400)
        
    syllabuses = Syllabus.objects.filter(school=school).select_related('classroom', 'subject')
    data = []
    for s in syllabuses:
        plans = list(s.lesson_plans.values('week_number', 'content'))
        data.append({
            'id': s.id,
            'classroom': s.classroom.name,
            'subject': s.subject.name,
            'file_url': s.file.url if s.file else None,
            'uploaded_at': s.uploaded_at.isoformat(),
            'plans': plans
        })
        
    return JsonResponse({'success': True, 'syllabuses': data})
