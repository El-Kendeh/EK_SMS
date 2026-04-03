import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from eksms_core.models import School
for s in School.objects.all():
    print(f"School: {s.name}")
    print(f"  Type: {s.institution_type}")
    print(f"  System: {s.academic_system}")
    print(f"  Capacity: {s.capacity}")
    print(f"  Website: {s.website}")
