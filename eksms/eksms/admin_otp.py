"""
Two-Factor Authentication setup for Django Admin
"""
from django.contrib import admin
from django.contrib.admin.views.decorators import staff_member_required
from django.http import HttpResponseRedirect, HttpResponse
from django.urls import path, reverse
from django.shortcuts import render, redirect
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import user_passes_test
from django_otp.decorators import otp_required
from django_otp.plugins.otp_totp.models import StaticDevice, StaticToken
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp.util import random_hex
import qrcode
from io import BytesIO
import base64


class OTPAdminSite(admin.AdminSite):
    """
    Custom AdminSite that requires OTP (2FA) for all staff members
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.site_header = "SMS Administration (2FA Protected)"
        self.site_title = "SMS Admin"
        self.index_title = "Welcome to SMS Administration"
    
    def _ensure_otp_device(self, user):
        """Ensure user has a TOTP device for 2FA"""
        if user.is_staff or user.is_superuser:
            # Check if user has a TOTP device already
            if not TOTPDevice.objects.filter(user=user, confirmed=True).exists():
                # Create a new TOTP device
                device = TOTPDevice.objects.create(
                    user=user,
                    name="default",
                    confirmed=False
                )
                return device
        return None
    
    def login(self, request, extra_context=None):
        """
        Override login to redirect to OTP setup if needed
        """
        if request.user.is_authenticated and (request.user.is_staff or request.user.is_superuser):
            device = self._ensure_otp_device(request.user)
            if device and not device.confirmed:
                # Redirect to OTP setup page
                return HttpResponseRedirect(reverse('admin:setup-otp'))
        
        return super().login(request, extra_context)
    
    def has_perm(self, request):
        """
        Check if user has permission AND has OTP enabled
        """
        has_admin_perm = super().has_perm(request)
        
        if has_admin_perm and (request.user.is_staff or request.user.is_superuser):
            # Check if user has confirmed TOTP device
            if not TOTPDevice.objects.filter(user=request.user, confirmed=True).exists():
                return False
        
        return has_admin_perm
    
    def get_urls(self):
        """
        Add custom URLs for OTP setup and management
        """
        custom_urls = [
            path('setup-otp/', self.admin_site_setup_otp, name='setup-otp'),
            path('otp/verify/', self.admin_site_verify_otp, name='verify-otp'),
            path('otp/generate-backup/', self.generate_backup_tokens, name='generate-backup-tokens'),
        ]
        return custom_urls + super().get_urls()
    
    def admin_site_setup_otp(self, request):
        """Setup TOTP for 2FA"""
        if not request.user.is_staff:
            return HttpResponseRedirect(reverse('admin:login'))
        
        user = request.user
        device = TOTPDevice.objects.filter(user=user, name='default').first()
        
        if not device:
            device = TOTPDevice.objects.create(user=user, name='default', confirmed=False)
        
        qr_code_url = None
        backup_tokens = None
        
        if request.method == 'POST':
            otp_token = request.POST.get('otp_token')
            
            if device.verify_token(otp_token):
                device.confirmed = True
                device.save()
                
                # Generate backup tokens
                backup_device, created = StaticDevice.objects.get_or_create(
                    user=user,
                    name='backup'
                )
                if created:
                    for _ in range(10):
                        StaticToken.objects.create(device=backup_device, token=random_hex(8))
                
                backup_tokens = list(StaticToken.objects.filter(device=backup_device).values_list('token', flat=True))
                
                # Redirect to admin
                return HttpResponseRedirect(reverse('admin:index'))
            else:
                return render(request, 'admin/otp_setup.html', {
                    'device': device,
                    'qr_code_url': qr_code_url,
                    'error': 'Invalid OTP token. Please try again.'
                })
        
        # Generate QR code
        if device:
            url = device.config_url
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(url)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            buffer = BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            qr_code_url = base64.b64encode(buffer.getvalue()).decode()
        
        return render(request, 'admin/otp_setup.html', {
            'device': device,
            'qr_code_url': qr_code_url,
            'backup_tokens': backup_tokens,
        })
    
    def admin_site_verify_otp(self, request):
        """Verify OTP token (placeholder for AJAX verification)"""
        if request.method == 'POST':
            otp_token = request.POST.get('otp_token')
            user = request.user
            
            # Verify against TOTP device
            device = TOTPDevice.objects.filter(user=user, confirmed=True).first()
            if device and device.verify_token(otp_token):
                return HttpResponse('valid')
            
            # Verify against backup tokens
            backup_device = StaticDevice.objects.filter(user=user, name='backup').first()
            if backup_device and backup_device.verify_token(otp_token):
                return HttpResponse('valid')
            
            return HttpResponse('invalid')
        
        return HttpResponse('method_not_allowed', status=405)
    
    def generate_backup_tokens(self, request):
        """Generate new backup tokens"""
        if not request.user.is_staff:
            return HttpResponseRedirect(reverse('admin:login'))
        
        user = request.user
        backup_device, created = StaticDevice.objects.get_or_create(
            user=user,
            name='backup'
        )
        
        # Delete old tokens
        StaticToken.objects.filter(device=backup_device).delete()
        
        # Generate new tokens
        backup_tokens = []
        for _ in range(10):
            token = StaticToken.objects.create(device=backup_device, token=random_hex(8))
            backup_tokens.append(token.token)
        
        return render(request, 'admin/backup_tokens.html', {
            'backup_tokens': backup_tokens,
        })
