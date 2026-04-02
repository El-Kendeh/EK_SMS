"""
WSGI config for eksms project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings_secure')

application = get_wsgi_application()
# Trigger reload: 2026-04-02T06:25:22Z
