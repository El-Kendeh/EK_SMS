"""
Minimal WSGI wrapper for production deployment
"""
import os
import sys

# Get the directory where this file is located
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Add project directories to path
sys.path.insert(0, os.path.join(BASE_DIR, 'eksms'))
sys.path.insert(0, BASE_DIR)

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings_secure')

# Import and initialize Django
import django
django.setup()

# Import the application
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()

