from django.conf import settings
from django.contrib import admin
from eksms.admin_otp import OTPAdminSite
from django_otp.admin import OTPAdminSite as DjangoOTPAdminSite

# Override default admin site with 2FA-enabled version
admin.site.__class__ = OTPAdminSite
