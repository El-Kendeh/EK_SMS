import os
import sys

# Get the directory where this file (project/eksms/wsgi.py) is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
# Path to the inner Django project directory
INNER_EKSMS = os.path.join(BASE_DIR, 'eksms')

# Ensure the container directory is in path
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# FIX: Name collision between outer folder 'eksms' and inner package 'eksms'
# Extending the 'eksms' package path allows Django to find submodules 
# like 'settings_secure' inside the nested directory.
import eksms
if hasattr(eksms, '__path__') and INNER_EKSMS not in eksms.__path__:
    eksms.__path__.append(INNER_EKSMS)

# Force settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings_secure')

# Initialize Django
import django
django.setup()

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
