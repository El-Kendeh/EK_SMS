"""
WSGI wrapper for Render.com deployment.
This file sits at the project root and properly imports the Django WSGI application.
"""

import os
import sys
import django

# Add the eksms directory to the Python path
base_dir = os.path.dirname(os.path.abspath(__file__))
eksms_dir = os.path.join(base_dir, 'eksms')
sys.path.insert(0, eksms_dir)
sys.path.insert(0, base_dir)

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings_secure')

# Setup Django
django.setup()

# Import the WSGI application
from eksms.wsgi import application

if __name__ == "__main__":
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)
