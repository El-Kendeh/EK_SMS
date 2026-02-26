import os
import sys

# Get the directory where this file (project/eksms/wsgi.py) is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Add the BASE_DIR to the beginning of the path
# This allows 'import eksms' to find the inner eksms package, 
# just like when running manage.py
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Set settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings_secure')

# Standard Django WSGI application
import django
django.setup()

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
