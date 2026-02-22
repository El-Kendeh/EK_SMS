import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings')
django.setup()

from django.apps import apps

try:
    app = apps.get_app_config('eksms')
    models = app.get_models()
    print(f"Found {len(models)} models in eksms app:")
    for model in models:
        print(f"  - {model.__name__}")
except Exception as e:
    print(f"Error: {e}")
    
# Try direct import
try:
    from models import AcademicYear
    print("\nDirect import successful: AcademicYear")
except ImportError as e:
    print(f"\nDirect import failed: {e}")
