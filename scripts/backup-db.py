"""Encrypted SQLite snapshots for trusted operators, never a browser export.

Requires cryptography (see requirements-backup.txt). Hosted D1 must first be
exported through its authorized infrastructure tooling; this CLI does not
possess provider credentials or claim to schedule production backups.
"""
import argparse
import base64
import getpass
import json
import os
from pathlib import Path
import sqlite3
import tempfile

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

MAGIC = b'VOIDLINE-BACKUP-1\n'
AAD = b'VOIDLINE/SQLite/backup/v1/scrypt-32768-8-1/AES-256-GCM'
MAX_BYTES = 512 * 1024 * 1024


def key_for(passphrase, salt):
    raw = passphrase.encode('utf-8')
    if len(passphrase) < 16 or len(raw) > 1024:
        raise ValueError('Use a backup passphrase of at least 16 characters.')
    return Scrypt(salt=salt, length=32, n=32768, r=8, p=1).derive(raw)


def validate_database(filename):
    with sqlite3.connect(Path(filename).resolve().as_uri() + '?mode=ro', uri=True) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise ValueError('The database integrity check failed.')
        if db.execute('PRAGMA foreign_key_check').fetchone() is not None:
            raise ValueError('The database contains broken foreign-key references.')


def write_private(filename, data):
    # O_EXCL prevents overwriting a database, following a symlink, or replacing
    # an existing backup accidentally. Nothing is sent to stdout but metadata.
    fd = os.open(filename, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        with os.fdopen(fd, 'wb') as output:
            output.write(data)
            output.flush()
            os.fsync(output.fileno())
    except BaseException:
        Path(filename).unlink(missing_ok=True)
        raise


def create_backup(database, destination, passphrase):
    source = Path(database).resolve()
    if not source.is_file() or source.stat().st_size > MAX_BYTES:
        raise ValueError('Choose a SQLite database no larger than 512 MiB.')
    # SQLite's backup API takes a consistent snapshot including committed WAL
    # content. The plaintext temporary copy stays inside a private directory.
    with tempfile.TemporaryDirectory(prefix='voidline-backup-') as directory:
        snapshot = Path(directory) / 'snapshot.sqlite'
        with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as original:
            with sqlite3.connect(snapshot) as copy:
                original.backup(copy)
        snapshot.chmod(0o600)
        validate_database(snapshot)
        payload = snapshot.read_bytes()
        if len(payload) > MAX_BYTES:
            raise ValueError('The snapshot exceeds the 512 MiB limit.')
        salt, nonce = os.urandom(16), os.urandom(12)
        encrypted = AESGCM(key_for(passphrase, salt)).encrypt(nonce, payload, AAD)
        write_private(destination, MAGIC + salt + nonce + encrypted)
    return {'format': 1, 'encrypted': True, 'bytes': Path(destination).stat().st_size}


def restore_backup(backup, destination, passphrase):
    source = Path(backup)
    if not source.is_file() or source.stat().st_size > MAX_BYTES + 4096:
        raise ValueError('Choose a supported backup no larger than 512 MiB.')
    raw = source.read_bytes()
    if not raw.startswith(MAGIC) or len(raw) < len(MAGIC) + 44:
        raise ValueError('This is not a supported VOIDLINE backup.')
    offset = len(MAGIC)
    salt, nonce = raw[offset:offset + 16], raw[offset + 16:offset + 28]
    try:
        payload = AESGCM(key_for(passphrase, salt)).decrypt(nonce, raw[offset + 28:], AAD)
    except InvalidTag as error:
        raise ValueError('The backup could not be unlocked or has been modified.') from error
    with tempfile.TemporaryDirectory(prefix='voidline-restore-') as directory:
        candidate = Path(directory) / 'candidate.sqlite'
        write_private(candidate, payload)
        validate_database(candidate)
        write_private(destination, payload)
    return {'format': 1, 'integrity': 'ok', 'bytes': len(payload)}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['create', 'restore'])
    parser.add_argument('--input', required=True, help='Trusted local SQLite database or encrypted backup')
    parser.add_argument('--output', required=True, help='New private output path; existing files are refused')
    args = parser.parse_args()
    phrase = getpass.getpass('Backup passphrase (hidden): ')
    if args.operation == 'create' and phrase != getpass.getpass('Confirm passphrase (hidden): '):
        parser.error('Passphrases did not match.')
    try:
        result = (create_backup if args.operation == 'create' else restore_backup)(args.input, args.output, phrase)
    except (ValueError, OSError, sqlite3.Error) as error:
        parser.exit(1, str(error) + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
