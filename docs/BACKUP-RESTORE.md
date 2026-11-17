# Protected database snapshots and restore

Production account and Standard message records use the managed D1 binding `DB`.
Backups contain sensitive database records, including credential/session/recovery
hashes and service-readable history. Account-scoped export is a separate feature;
no browser or owner-dashboard endpoint provides a raw database backup.

## Hosted snapshot foundation

`worker/hosted-backup.mjs` implements a protected infrastructure operation:

- `createHostedBackup(env, {now?, limits?})` returns only a content-free receipt.
- `hostedBackupHealth(env)` distinguishes database/storage/key configuration from
  a stored receipt and from an actual production restore.
- The caller must independently authorize every run and health request. Merely
  importing this module does not grant administrative authority. The root
  operations integration documents its operator binding and scheduling separately
  in `OPERATIONS.md`.

The required bindings are `DB`, private R2 `MEDIA`, and server secret
`VOIDLINE_BACKUP_KEY`: 32 cryptographically random bytes encoded as standard
base64 (44 characters ending in `=`). Install it through the secret store only
when the authorized operator can also retain the key separately and obtain a
protected backup artifact. Keep it out of chat, source, build inputs, public
configuration, logs, browser exports and scheduled prompts. Losing this key
makes its backups unusable. Preserve old keys when rotating; an old backup does
not become decryptable with a replacement key.

The code being installed does **not** establish that a key, operator connection,
schedule, retention policy or provider restore has been configured. Check the
current operator-only health result and `OPERATIONS.md` for deployment evidence.
`productionRestoreVerified` remains false; a stored receipt is not restoration
proof. No retention guarantee is inferred from it.

### Consistency, scope and limits

The exporter discovers application tables and their deployed SQL using
`sqlite_master`, including newly deployed tables rather than a hand-maintained
allowlist. SQLite and Cloudflare internal objects are excluded; migration
bookkeeping tables are preserved when present. Each snapshot contains:

- Actual table/index/view/trigger SQL and an authenticated schema SHA-256.
- Column metadata, typed rows and autoincrement sequence state. Integer values
  use decimal strings, real values a round-trip representation and blobs hex,
  preventing JavaScript's integer precision limit from corrupting a backup.
- Existing migration bookkeeping and current R2 object references.

One bounded schema/column join and preflight size measurements precede the final **single D1
`batch()` transaction** containing the schema checks, bounded table reads and
sequence state. All application data comes from that transaction. A schema
change since discovery causes a deliberate retry error. Row/byte guards are
re-evaluated inside the transaction, preventing concurrent growth from returning
unbounded results. An oversize or unsupported schema fails the operation; there
is no successful truncated backup.

Default hard bounds are 128 tables, 64 writable columns per table, 5,000 rows per
table, 25,000 total rows, 4 MiB of typed row data per table, 256 KiB of schema and
8 MiB for the complete serialized plaintext snapshot. Callers may lower these
bounds. Generated columns are reconstructed from schema and are not inserted as
ordinary writable cells. Virtual tables require a provider-specific export and
are rejected instead of being silently omitted.

Queries group up to five tables per statement, at most 15 bound parameters per
row-read statement. The exporter uses approximately
`3 × ceil(tableCount / 5) + 4 + (hasAutoincrement ? 1 : 0)` D1 statements. The
current full migrated schema with additional test tables fits below 50. The isolated D1 runtime enforces five compound-SELECT terms, so the exporter
keeps each grouped query within that actual limit. D1 plan
limits and Worker execution/response limits still apply: Free and paid plans
have different per-invocation query budgets. Large future schemas can exceed a
plan limit before the documented data bounds. Such a failure is reported and
requires compatible provider export/backup infrastructure. Read measurements
scan data; this is a bounded full snapshot rather than an incremental backup.

### Encryption and completion

The hosted `.vlhb` format uses AES-256-GCM through maintained WebCrypto, a fresh
12-byte random nonce per backup, a 128-bit authentication tag, and authenticated
version/algorithm/ID/time/schema metadata. The binary framing is:

1. `VOIDLINE-HOSTED-BACKUP-1\n` magic.
2. Four-byte big-endian JSON header length, then the UTF-8 header.
3. AES-GCM ciphertext with its tag. AAD is
   `VOIDLINE/hosted-d1-backup/v1\n` followed by the exact header bytes.

The server key protects database backups at rest. This is distinct from message
E2EE: the service operator holding the backup key can recover Standard history
and other database records. It does not reveal Matrix content keys that were
never stored by this service.

Artifacts stay under private R2 keys:
`__voidline_internal/backups/v1/<id>.vlhb`. Only after the encrypted object write
succeeds does the operation put `<id>.json`, its small completion receipt, then
`latest.json`. A failure never returns success. A failed receipt/pointer write
can leave a private orphan artifact; inspect protected storage before cleanup or
retry. There is no automatic deletion/retention worker in this module, and
concurrent runs use separate immutable IDs and nonces. `latest.json` is the last
successfully indexed completion, not a proof of a monotonic start time or a
successful restore.

## Restore a hosted artifact in isolation

1. Through authorized infrastructure tooling, obtain the encrypted `.vlhb` and
   matching receipt from private storage. This implementation exposes no public
   artifact-download endpoint. Keep the artifact and every plaintext result out
   of `dist/`, source control, public downloads and browser caches.
2. Use an isolated operator environment and the pinned dependency:

   ```sh
   python3 -m pip install -r requirements-backup.txt
   python3 scripts/restore-hosted-backup.py --input /private/backup.vlhb --output /private/restore-check.sqlite
   ```

   Enter the backup key at the hidden prompt. Alternatively, `--key-file` accepts
   a protected private key file; files readable by group/other users are refused
   on POSIX. Do not place the key itself on the command line.
3. The restore authenticates the complete envelope, verifies the embedded
   deployed-schema digest, and creates a new owner-only (`0600`) SQLite file.
   Existing files and symlinks are never overwritten. A private temporary
   directory holds the candidate. Tables and rows are restored **before
   triggers**, preventing historical events and ownership/revision side effects
   from being replayed. It then restores indexes, views, triggers and sequence
   state, checks exact schema/row counts, runs `integrity_check` and
   `foreign_key_check`, and writes the final destination only after validation.
4. Test the application against this isolated database: stable account/message
   IDs, real memberships, ownership, gift transfers, status and migration state.
   The database includes old session/recovery records. Keep staging unreachable
   by real clients; decide which restored sessions and credentials require
   revocation before any authorized production cutover.
5. Actual production replacement still requires the managed provider's supported
   restore/import tooling, confirmed schema/application compatibility, a write
   maintenance window and a protected pre-restore rollback snapshot. This CLI
   neither connects to nor overwrites production D1. A successful local restore
   does not establish that the hosting provider can complete that cutover.

## R2 files and Matrix recovery are separate

The database snapshot includes R2 object references, **not uploaded file bytes**.
Avatar/banner and Standard attachment/voice objects need a separate protected
object backup, retention/versioning plan and isolated media restore test. The
D1/R2 pair is not an atomic cross-service snapshot, and taking a D1 backup does
not pin media objects against later cleanup. Coordinate a write maintenance
window or suitable object-version retention when establishing a recoverable
combined release. A restored database can reference missing media until that
separate restore is completed.

Matrix homeserver databases, ciphertext media and signing configuration have
their own operator backups. User device keys and encrypted-history recovery
remain separate from native accounts and D1. A D1 restore or account password
reset cannot recover unavailable E2EE keys.

## Existing local-export format

The older `scripts/backup-db.py` remains available for an already authorized
local SQLite export:

```sh
python3 scripts/backup-db.py create --input /private/export.sqlite --output /private/backup.vlb
python3 scripts/backup-db.py restore --input /private/backup.vlb --output /private/local-restore.sqlite
```

This separate `.vlb` format uses SQLite's consistent backup API, Scrypt
(`N=32768,r=8,p=1`) and AES-256-GCM from pinned `cryptography` 50.0.0, fresh salts
and nonces, and a hidden passphrase. Its limit is 512 MiB. Hosted `.vlhb` snapshots
use the new restore CLI and server backup key; the two formats are intentionally
not interchangeable.

## Verification evidence

`node backend/hosted-backup-test.mjs` covers the full immutable migrated schema,
actual isolated workerd/D1/R2 bindings, WebCrypto encryption, and Python/SQLite
restoration. It verifies retained messages/memberships/credential hashes,
precision-preserving integer/real/blob/text cells, generated columns, views,
indexes/triggers, autoincrement sequence state, migration records and R2
references. Wrong valid keys, modified ciphertext/header, overwrite attempts,
row/byte/schema limits, concurrent schema/growth and staged R2 failures are
checked. Receipts and stored ciphertext do not contain test message plaintext.

`python3 backend/backup-test.py` additionally exercises the older local SQLite
snapshot format, permissions, integrity/FKs, wrong-key/tamper and overwrite
refusal.

These establish controlled and isolated runtime/restore behavior. They do not
establish production artifact retrieval, scheduled retention, production D1
restoration, restoration of R2 file bytes, a browser flow or an independent
security review. Record those separately when performed.
