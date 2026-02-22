from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django_otp.plugins.otp_totp.models import TOTPDevice
from django_otp.plugins.otp_totp.models import StaticDevice, StaticToken
from django_otp.util import random_hex


class Command(BaseCommand):
    help = 'Enable 2FA (TOTP) for admin/staff users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username to enable 2FA for',
        )
        parser.add_argument(
            '--all-staff',
            action='store_true',
            help='Enable 2FA requirement for all staff',
        )

    def handle(self, *args, **options):
        if options['all_staff']:
            staff_users = User.objects.filter(is_staff=True)
            self.stdout.write(f'Found {staff_users.count()} staff users')
            
            for user in staff_users:
                device = TOTPDevice.objects.filter(user=user, name='default').first()
                if not device:
                    device = TOTPDevice.objects.create(
                        user=user,
                        name='default',
                        confirmed=False
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ 2FA device created for {user.username} (NOT YET CONFIRMED)'
                        )
                    )
                    self.stdout.write(f'  User must login to admin and scan QR code to confirm')
                else:
                    status = "CONFIRMED" if device.confirmed else "PENDING"
                    self.stdout.write(f'  {user.username}: {status}')
        
        elif options['user']:
            try:
                user = User.objects.get(username=options['user'])
                device = TOTPDevice.objects.filter(user=user, name='default').first()
                
                if not device:
                    device = TOTPDevice.objects.create(
                        user=user,
                        name='default',
                        confirmed=False
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'✓ 2FA device created for {user.username}'
                        )
                    )
                    self.stdout.write('User must login to admin to scan QR code and confirm')
                else:
                    status = "CONFIRMED" if device.confirmed else "PENDING"
                    self.stdout.write(f'{user.username} 2FA status: {status}')
            
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'User {options["user"]} not found'))
        
        else:
            self.stdout.write(
                self.style.WARNING('Usage: python manage.py setup_admin_2fa [--user USERNAME | --all-staff]')
            )
