import os
import django

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'eksms.settings_secure')
django.setup()

from django.apps import apps
from django.contrib.auth.models import User, Group
from django.contrib.sessions.models import Session
from django.contrib.admin.models import LogEntry
from django.db import transaction

@transaction.atomic
def reset_db():
    print("Starting database reset (preserving users and groups)...")

    # 1. Clear all models in eksms_core
    try:
        app_config = apps.get_app_config('eksms_core')
        for model in app_config.get_models():
            count = model.objects.count()
            if count > 0:
                print(f"Clearing {model.__name__} ({count} records)...")
                model.objects.all().delete()
    except Exception as e:
        print(f"Error clearing eksms_core models: {e}")

    # 2. Clear non-essential Django tables
    print("Clearing sessions and admin logs...")
    try:
        session_count = Session.objects.count()
        Session.objects.all().delete()
        print(f"Cleared {session_count} sessions.")
        
        log_count = LogEntry.objects.count()
        LogEntry.objects.all().delete()
        print(f"Cleared {log_count} admin log entries.")
    except Exception as e:
        print(f"Error clearing utility tables: {e}")

    # 3. Clear 2FA devices (optional but usually part of a data wipe)
    try:
        from django_otp.plugins.otp_totp.models import TOTPDevice
        otp_count = TOTPDevice.objects.count()
        TOTPDevice.objects.all().delete()
        print(f"Cleared {otp_count} 2FA devices.")
    except ImportError:
        pass
    except Exception as e:
        print(f"Error clearing OTP devices: {e}")

    print("\nReset complete. All application data has been removed.")
    print(f"Preserved Users: {User.objects.count()}")
    print(f"Preserved Groups: {Group.objects.count()}")

if __name__ == "__main__":
    reset_db()
