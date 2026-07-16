# Database backup & restore runbook

`scripts/backup.js` makes a portable logical dump of the whole MySQL database
over the app's own `mysql2` connection (no `mysqldump` binary needed). Output:
`backend_node/backups/eksms-backup-<ISO>.sql.gz`, gzip-compressed, keeping the
last 14 (configurable via `BACKUP_KEEP`). It reads the same `DB_*` env vars the
backend uses.

Run it:

```bash
cd backend_node
npm run backup          # writes one dump, prunes old ones
```

The superadmin "Create backup" button (`POST /api/sa/backup/manual/`) now runs
this same function and records the real filename + size.

## Scheduling (pick ONE — do NOT skip this)

An on-demand dump is not disaster recovery. You need it to run unattended AND
land somewhere durable.

### If the database is managed (Render/PlanetScale/RDS/etc.)
Turn on the **provider's native automated backups + point-in-time recovery** in
their dashboard. That is the primary DR mechanism — it captures binlogs, not
just a nightly snapshot. Treat `scripts/backup.js` as a portable, provider-
independent secondary copy you can restore anywhere.

### If you self-host on a VM / box with a persistent disk
Cron the script:

```cron
# 02:00 daily — dump to the persistent disk, log output
0 2 * * *  cd /srv/ek-sms/backend_node && /usr/bin/npm run backup >> /var/log/eksms-backup.log 2>&1
```

Then copy `backups/` offsite (rsync/rclone to object storage) — a backup on the
same box that dies with the box is not a backup.

### ⚠️ Ephemeral-container hosts (Render web service, Heroku, Fly)
Their filesystem is wiped on every deploy/restart. A cron that writes to
`backend_node/backups/` produces dumps that **vanish** — useless for DR. On
those hosts you MUST either:
- use the managed-DB native backups (preferred), or
- push each dump to object storage (S3/R2/B2) from the backup step, or
- attach a persistent disk and write the dump there.

Object-storage upload is deliberately not built into `backup.js` (it would drag
in a cloud SDK + credentials this repo can't test). Add ~10 lines calling your
provider's SDK after `runBackup()` when you know which bucket you're using.

## Restore

```bash
gunzip -c backups/eksms-backup-<ISO>.sql.gz | mysql -u<user> -p <db_name>
```

The dump wraps every table in `DROP TABLE` + `CREATE TABLE` + `INSERT` with
`FOREIGN_KEY_CHECKS=0`, so restore order doesn't matter. **Test a restore into a
scratch database before you rely on it** — an untested backup is a guess.

## Known ceiling

Naive full-table `SELECT *` held in memory, one `INSERT` per row. Fine at pilot
scale. When a single table passes ~1e6 rows, switch to streamed batches or the
managed provider's snapshot/PITR and keep this as the portable fallback.
