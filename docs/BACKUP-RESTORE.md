# Protected database snapshots and restore

Production data belongs to the managed D1 binding `DB`. Browser downloads and
the owner dashboard do not expose credential hashes, session bearers or a raw
full database. Account export is a separate, scoped application operation.

## Trusted operator procedure

1. Obtain an authorized database export from the hosting/provider administrator.
   The Sites connector used for this release exposes table reads and deployment,
   not a complete production D1 export, scheduling, Time Travel or restore API.
   No production backup schedule or retention guarantee is inferred from it.
2. Restore the export into an isolated SQLite database using trusted local
   infrastructure. Keep the database/export out of `dist/`, source control,
   build inputs, browser storage and public download paths.
3. Install the pinned operator dependency with
   `python3 -m pip install -r requirements-backup.txt` in a suitable isolated
   Python environment. Create a sealed snapshot:

   ```sh
   python3 scripts/backup-db.py create --input /private/export.sqlite --output /private/voidline-backup.vlb
   ```

   The passphrase is requested on hidden stdin and confirmed. Keep it in a
   separate private recovery location. Losing it makes this backup unusable.
4. Copy the encrypted `.vlb` to protected operator-controlled backup storage,
   with access logging, retention limits and an independently retained key.
   Delete plaintext staging exports according to the operator's storage policy.
5. Test a restore into a **new isolated path**, never directly over production:

   ```sh
   python3 scripts/backup-db.py restore --input /private/voidline-backup.vlb --output /private/restore-check.sqlite
   ```

   The CLI refuses an existing output, validates SQLite integrity and foreign
   keys, and writes owner-only files. Test account access, row counts, stable
   IDs, memberships, gift ownership and applicable application queries before
   planning any authorized production restore.
6. A production restore needs the managed hosting/provider operator's supported
   database restore tooling and a maintenance/rollback plan. Stop writes,
   preserve a pre-restore snapshot, apply the confirmed database/schema version,
   verify application compatibility, and invalidate sessions as appropriate.
   This release does not claim to have restored the live D1 database.

## Format and verification

Format 1 uses SQLite's consistent backup API, a private temporary snapshot,
Scrypt (`N=32768,r=8,p=1`) and AES-256-GCM from maintained `cryptography` 50.0.0.
A fresh 16-byte salt and 12-byte nonce are generated for each snapshot; format
metadata is authenticated as AAD. The tool supports databases up to 512 MiB.
This is backup encryption, not a message encryption protocol. An operator
holding the passphrase can recover the database, including credential hashes
and legacy plaintext; protect it accordingly.

`python3 backend/backup-test.py` applies the actual migration chain in isolation,
creates account/credential/community/membership/message fixtures, encrypts a
snapshot and restores it to a different file. It checks preserved values,
foreign keys, file permissions, wrong-key rejection, tamper rejection and
refusal to overwrite an existing restored database. These checks provide local
restore evidence and do not establish hosted D1 backup retention or recovery.

Encrypted messaging history and device keys have their own Matrix recovery
system. A D1 restore cannot recover encryption keys that were never held by the
service, and an account password reset cannot decrypt an unavailable history.
