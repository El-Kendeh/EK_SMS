"""
URL configuration for eksms project with security considerations.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path
from django.views.generic import RedirectView
from django.views.defaults import page_not_found, server_error
from .views import favicon_view

urlpatterns = [
    # Favicon
    path('favicon.jpeg', favicon_view, name='favicon'),
    
    # Root URL redirects to admin
    path('', RedirectView.as_view(url='admin/', permanent=False)),
    
    # Admin interface
    path('admin/', admin.site.urls),
    
    # API endpoints should be added here
    # Example: path('api/auth/', include('api.urls')),
]

# Custom error handlers for better security (don't expose stack traces in production)
handler404 = page_not_found
handler500 = server_error

# Security configuration for admin site
admin.site.site_header = "SMS Administration"
admin.site.site_title = "SMS Admin"
admin.site.index_title = "Welcome to SMS Administration"
