# UserToken Column Fix Guide

## Issues Fixed
1. **Missing UserToken token_type column** - Server error (500) with MySQL 1054 error
2. **MySQL warning about verification_token** - Unique CharField > 255 characters not allowed

## Root Cause
1. **UserToken Issue**: Model has `token_type` field but database table doesn't. Migration was never applied.
2. **GradeVerification Issue**: `verification_token` field uses CharField(max_length=256, unique=True), but MySQL doesn't allow unique CharFields longer than 255 characters.

## Solution Applied

### Fix 1: Added Missing UserToken token_type Column
Created migration file: `eksms/eksms_core/migrations/0041_usertoken_token_type.py`

This migration adds the missing `token_type` VARCHAR(50) column to the `eksms_core_usertoken` table with:
- **Field name**: `token_type`
- **Type**: VARCHAR(50)
- **Default value**: 'access'
- **Nullable**: NO

### Fix 2: Changed verification_token to TextField
Created migration file: `eksms/eksms_core/migrations/0042_alter_gradeverification_verification_token.py`

This migration changes the `verification_token` field from CharField to TextField:
- **Before**: `CharField(max_length=256, unique=True)`
- **After**: `TextField(unique=True)`
- **Reason**: MySQL doesn't support unique CharFields > 255 characters

### Model Updates
Updated `eksms_core/models.py`:
- UserToken: Added `token_type` field
- GradeVerification: Changed `verification_token` from CharField to TextField

## Solution

### What Was Fixed
Created new migration file: `eksms/eksms_core/migrations/0041_usertoken_token_type.py`

This migration adds the missing `token_type` VARCHAR(50) column to the `eksms_core_usertoken` table with:
- **Field name**: `token_type`
- **Type**: VARCHAR(50)
- **Default value**: 'access'
- **Nullable**: NO

### How to Apply the Fix

#### Option 1: On Ubuntu/Linux Server (Recommended for Production)

**If running as service/systemd:**
```bash
cd /path/to/your/project
python eksms/manage.py migrate eksms_core
```

**If running in Docker:**
```bash
docker-compose down
docker-compose up -d
# OR manually run:
docker-compose exec backend python eksms/manage.py migrate eksms_core
```

**Or use the provided fix script:**
```bash
chmod +x fix-usertoken-column.sh
./fix-usertoken-column.sh /path/to/your/project
```

#### Option 2: On Windows (PowerShell)

```powershell
cd C:\path\to\your\project
python eksms\manage.py migrate eksms_core
```

**Or use the provided fix script:**
```powershell
.\fix-usertoken-column.ps1 C:\path\to\your\project
```

### Verification

After running the migration, verify the column was created:

```bash
# On your MySQL database
mysql -u your_user -p your_database -e "DESCRIBE eksms_core_usertoken;"
```

You should see the `token_type` column in the output:
```
| token_type | varchar(50) | NO   | MUL |       | access  |
```

Or run the Python verification:
```python
python eksms/manage.py shell
```

Then in the Django shell:
```python
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT COLUMN_NAME FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'eksms_core_usertoken'
    """)
    columns = [row[0] for row in cursor.fetchall()]
    print('token_type' in columns)  # Should print True
```

### After the Fix

1. **Restart your backend:**
   ```bash
   # If using Docker
   docker-compose restart backend
   
   # If using systemd
   sudo systemctl restart ek-sms-backend
   
   # If running directly
   pkill -f "python eksms/manage.py runserver"
   python eksms/manage.py runserver
   ```

2. **Test the API:**
   Try logging in or any endpoint that uses user tokens. The 500 error should be gone.

3. **Monitor logs:**
   ```bash
   # Docker
   docker-compose logs -f backend
   
   # Systemd
   journalctl -u ek-sms-backend -f
   ```

## Technical Details

### Migration File Structure
The new migration file follows Django's standard migration format:
- Depends on: `0040_ensure_student_columns`
- Operation: AddField to `usertoken` model
- Field: `token_type` CharField with default value 'access'

### Database Changes
**UserToken Fix**:
- Added VARCHAR(50) column with default value 'access'
- Existing rows won't be affected
- Fully reversible if needed

**GradeVerification Fix**:
- Changed from VARCHAR(256) to TEXT
- Maintains uniqueness and indexing
- Compatible with longer verification tokens

### Model Definition (in eksms_core/models.py)
```python
class UserToken(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tokens')
    token = models.CharField(max_length=255, unique=True)
    token_type = models.CharField(max_length=50, default='access')  # ← Added this field
    expires_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class GradeVerification(models.Model):
    grade = models.OneToOneField(Grade, on_delete=models.CASCADE, related_name='verification')
    verification_token = models.TextField(unique=True, db_index=True,  # ← Changed to TextField
                                         help_text="Unique token for verification")
    # ... other fields
```

## Troubleshooting

### Migration Already Applied?
If you get an error saying the migration already exists:
```bash
python eksms/manage.py showmigrations eksms_core
```

Look for `[X] 0041_usertoken_token_type` and `[X] 0042_alter_gradeverification_verification_token` - if marked with [X], they're applied.

### Permission Denied on Linux?
```bash
sudo chown -R your_user: /path/to/project
# Then run migration
```

### Docker Permission Issues?
```bash
docker-compose exec -u root backend python eksms/manage.py migrate eksms_core
```

### Database Connection Failed?
Verify your `.env` file has correct database credentials:
```env
DB_HOST=your_mysql_host
DB_PORT=3306
DB_NAME=your_database
DB_USER=your_user
DB_PASSWORD=your_password
```

### Still Getting MySQL Warnings?
After applying the migration, run:
```bash
python eksms/manage.py check --deploy
```

This will show any remaining database warnings. The verification_token warning should be gone.

### Verification Token Issues?
If you have existing verification tokens longer than 255 characters, they will be preserved. The TextField change is backward compatible.

## Need Help?

If the error persists after migration:
1. Check database logs: `mysql error logs`
2. Verify migration status: `python eksms/manage.py showmigrations`
3. Try reverting and re-applying: `python eksms/manage.py migrate eksms_core 0040` then `python eksms/manage.py migrate eksms_core`
4. Check if there are syntax errors: `python eksms/manage.py migrate --plan`

---

**Last Updated**: 2026-05-13
**Status**: ✓ Ready for deployment
**Issues Fixed**: UserToken token_type column + GradeVerification MySQL warning
