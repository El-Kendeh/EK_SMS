import os
import sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "eksms.settings")
import django
django.setup()
from django.core.management import call_command

try:
    call_command("migrate")
except Exception as e:
    import traceback
    traceback.print_exc()
