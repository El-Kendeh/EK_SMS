"""
URL configuration for eksms project with security considerations.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
"""
from django.contrib import admin
from django.urls import path
from django.views.generic import RedirectView
from django.views.defaults import page_not_found, server_error
from .views import favicon_view, api_login

urlpatterns = [
    # Favicon
    path('favicon.jpeg', favicon_view, name='favicon'),
    
    # API endpoints
    path('api/login/', api_login, name='api_login'),
    
    # Root URL redirects to admin
    path('', RedirectView.as_view(url='admin/', permanent=False)),
    
    # Admin interface
    path('admin/', admin.site.urls),
]

# Custom error handlers for better security (don't expose stack traces in production)
handler404 = page_not_found
handler500 = server_error

# Security configuration for admin site
admin.site.site_header = "SMS Administration"
admin.site.site_title = "SMS Admin"
admin.site.index_title = "Welcome to SMS Administration"

