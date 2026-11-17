"""Restore an authenticated hosted D1 snapshot into a NEW isolated SQLite file.

This operator-only CLI does not connect to production or copy R2 media bytes.
Requires cryptography from requirements-backup.txt. Keep the key, input and
plaintext output on protected operator storage, never a public website/export.
"""
import argparse
import base64
import binascii
import getpass
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import struct
import tempfile

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

MAGIC = b'VOIDLINE-HOSTED-BACKUP-1\n'
AAD_PREFIX = b'VOIDLINE/hosted-d1-backup/v1\n'
MAX_PLAINTEXT = 8 * 1024 * 1024
MAX_INPUT = MAX_PLAINTEXT + 16384
IDENTIFIER = re.compile(r'^[A-Za-z_][A-Za-z0-9_]{0,127}$')


def quote_identifier(name):
    if not isinstance(name, str) or not IDENTIFIER.fullmatch(name):
        raise ValueError('The snapshot contains an unsupported identifier.')
    return '"' + name + '"'


def private_write(destination, source):
    fd = os.open(destination, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        with os.fdopen(fd, 'wb') as output:
            shutil.copyfileobj(source, output, 1024 * 1024)
            output.flush()
            os.fsync(output.fileno())
    except BaseException:
        Path(destination).unlink(missing_ok=True)
        raise


def decode_key(value):
    try:
        if not isinstance(value, str) or not re.fullmatch(r'[A-Za-z0-9+/]{43}=', value):
            raise ValueError()
        raw = base64.b64decode(value, validate=True)
        if len(raw) != 32:
            raise ValueError()
        return raw
    except (ValueError, binascii.Error) as error:
        raise ValueError('Use the protected 32-byte base64 key for this backup.') from error


def decode_cell(cell):
    if not isinstance(cell, list) or len(cell) != 2:
        raise ValueError('The snapshot contains an invalid typed cell.')
    kind, value = cell
    if kind == 'null' and value is None:
        return None
    if not isinstance(value, str):
        raise ValueError('The snapshot contains an invalid typed value.')
    try:
        if kind == 'text':
            return value
        if kind == 'integer' and re.fullmatch(r'-?\d+', value):
            number = int(value)
            if -(2 ** 63) <= number <= 2 ** 63 - 1:
                return number
        if kind == 'real':
            return float(value)
        if kind == 'blob' and re.fullmatch(r'(?:[0-9A-Fa-f]{2})*', value):
            return bytes.fromhex(value)
    except (ValueError, OverflowError) as error:
        raise ValueError('The snapshot contains an invalid typed value.') from error
    raise ValueError('The snapshot contains an unsupported typed value.')


def load_snapshot(filename, secret):
    source = Path(filename)
    if not source.is_file() or source.stat().st_size > MAX_INPUT:
        raise ValueError('Choose a supported hosted backup within the 8 MiB snapshot bound.')
    raw = source.read_bytes()
    if not raw.startswith(MAGIC) or len(raw) < len(MAGIC) + 4 + 16:
        raise ValueError('This is not a supported hosted VOIDLINE backup.')
    header_length = struct.unpack('>I', raw[len(MAGIC):len(MAGIC) + 4])[0]
    if not 1 <= header_length <= 4096:
        raise ValueError('The hosted backup header is invalid.')
    offset = len(MAGIC) + 4
    header_raw = raw[offset:offset + header_length]
    try:
        header = json.loads(header_raw)
        if header.get('format') != 1 or header.get('algorithm') != 'AES-256-GCM':
            raise ValueError()
        nonce = base64.b64decode(header['nonce'], validate=True)
        if len(nonce) != 12 or not re.fullmatch(r'\d{13}-[a-f0-9-]{36}', header['id']):
            raise ValueError()
        plaintext = AESGCM(decode_key(secret)).decrypt(nonce, raw[offset + header_length:], AAD_PREFIX + header_raw)
    except (InvalidTag, ValueError, KeyError, TypeError, binascii.Error, UnicodeDecodeError) as error:
        raise ValueError('The backup could not be unlocked or its authenticated header/content was modified.') from error
    if len(plaintext) > MAX_PLAINTEXT:
        raise ValueError('The snapshot exceeds the supported restore bound.')
    try:
        snapshot = json.loads(plaintext)
        if snapshot['format'] != 1 or snapshot['id'] != header['id'] or snapshot['createdAt'] != header['createdAt']:
            raise ValueError()
        actual_hash = hashlib.sha256(json.dumps(snapshot['schema'], ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()
        if actual_hash != header['schemaSha256'] or actual_hash != snapshot['schemaSha256']:
            raise ValueError()
        if snapshot.get('media', {}).get('objectBytesIncluded') is not False:
            raise ValueError()
    except (ValueError, KeyError, TypeError, UnicodeDecodeError) as error:
        raise ValueError('The authenticated snapshot manifest is invalid.') from error
    return snapshot


def validate_snapshot(snapshot):
    tables, schema = snapshot.get('tables'), snapshot.get('schema')
    if not isinstance(tables, list) or not 1 <= len(tables) <= 128 or not isinstance(schema, list):
        raise ValueError('The snapshot table manifest is invalid.')
    names, schema_names, total = set(), set(), 0
    for item in schema:
        if not isinstance(item, dict) or item.get('type') not in ('table', 'index', 'view', 'trigger'):
            raise ValueError('The snapshot schema object is invalid.')
        quote_identifier(item.get('name'))
        quote_identifier(item.get('table'))
        kind = item['type']
        valid_prefix = {'table': r'CREATE\s+TABLE\b', 'index': r'CREATE\s+(?:UNIQUE\s+)?INDEX\b', 'view': r'CREATE\s+VIEW\b', 'trigger': r'CREATE\s+TRIGGER\b'}[kind]
        if not isinstance(item.get('sql'), str) or not re.match(r'^\s*' + valid_prefix, item['sql'], re.IGNORECASE):
            raise ValueError('The snapshot contains unsupported schema SQL.')
        if kind == 'table':
            schema_names.add(item['name'])
    for table in tables:
        name = table.get('name')
        quote_identifier(name)
        if name in names:
            raise ValueError('The snapshot has duplicate tables.')
        names.add(name)
        columns, rows = table.get('columns'), table.get('rows')
        if not isinstance(columns, list) or not 1 <= len(columns) <= 64 or not isinstance(rows, list) or len(rows) > 5000 or table.get('rowCount') != len(rows):
            raise ValueError('The snapshot column/row manifest is invalid.')
        column_names = [column.get('name') for column in columns]
        if len(set(column_names)) != len(column_names):
            raise ValueError('The snapshot has duplicate columns.')
        for column in column_names:
            quote_identifier(column)
        for row in rows:
            if not isinstance(row, list) or len(row) != len(columns):
                raise ValueError('The snapshot contains an invalid row.')
        total += len(rows)
    if names != schema_names or total > 25000 or snapshot.get('counts') != {'tables': len(tables), 'rows': total}:
        raise ValueError('The snapshot schema/table counts do not match.')
    return total


def restore_hosted_backup(filename, destination, secret):
    target = Path(destination)
    if target.exists() or target.is_symlink():
        raise FileExistsError('Choose a new isolated destination; an existing file is never overwritten.')
    snapshot = load_snapshot(filename, secret)
    total = validate_snapshot(snapshot)
    # TemporaryDirectory is 0700; the plaintext database itself is always 0600.
    with tempfile.TemporaryDirectory(prefix='voidline-hosted-restore-', dir=target.parent) as directory:
        candidate = Path(directory) / 'candidate.sqlite'
        fd = os.open(candidate, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
        os.close(fd)
        with sqlite3.connect(candidate) as db:
            db.execute('PRAGMA foreign_keys=OFF')
            db.execute('PRAGMA trusted_schema=OFF')
            db.execute('BEGIN')
            # Triggers intentionally do not exist while historical rows are imported.
            for item in snapshot['schema']:
                if item['type'] == 'table':
                    db.execute(item['sql'])
            for table in snapshot['tables']:
                columns = ','.join(quote_identifier(column['name']) for column in table['columns'])
                sql = 'INSERT INTO ' + quote_identifier(table['name']) + '(' + columns + ') VALUES(' + ','.join('?' for _ in table['columns']) + ')'
                db.executemany(sql, (tuple(decode_cell(cell) for cell in row) for row in table['rows']))
            sequences = snapshot.get('sqliteSequence', [])
            if sequences:
                if not isinstance(sequences, list) or len(sequences) > 128:
                    raise ValueError('The snapshot sequence manifest is invalid.')
                db.execute('DELETE FROM sqlite_sequence')
                for row in sequences:
                    if row.get('name') not in {table['name'] for table in snapshot['tables']} or not re.fullmatch(r'\d+', row.get('seq', '')):
                        raise ValueError('The snapshot sequence manifest is invalid.')
                    db.execute('INSERT INTO sqlite_sequence(name,seq) VALUES(?,?)', (row['name'], int(row['seq'])))
            for kind in ('index', 'view', 'trigger'):
                for item in snapshot['schema']:
                    if item['type'] == kind:
                        db.execute(item['sql'])
            db.commit()
            db.execute('PRAGMA foreign_keys=ON')
            if db.execute('PRAGMA integrity_check').fetchall() != [('ok',)]:
                raise ValueError('The restored database failed its integrity check.')
            if db.execute('PRAGMA foreign_key_check').fetchone() is not None:
                raise ValueError('The restored database has broken foreign-key references.')
            for table in snapshot['tables']:
                if db.execute('SELECT COUNT(*) FROM ' + quote_identifier(table['name'])).fetchone()[0] != table['rowCount']:
                    raise ValueError('A restored table has an unexpected row count.')
            restored_schema = [{'type': row[0], 'name': row[1], 'table': row[2], 'sql': row[3]} for row in db.execute("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','view','trigger') ORDER BY type,name") if row[3] and not re.match(r'^(?:sqlite_|_cf_)', row[1], re.IGNORECASE) and not re.match(r'^(?:sqlite_|_cf_)', row[2], re.IGNORECASE)]
            if restored_schema != snapshot['schema']:
                raise ValueError('The restored schema differs from the authenticated deployed schema.')
        with candidate.open('rb') as data:
            private_write(target, data)
    return {'format': 1, 'integrity': 'ok', 'tableCount': len(snapshot['tables']), 'rowCount': total, 'mediaReferenceCount': len(snapshot.get('mediaReferences', [])), 'mediaBytesRestored': False, 'productionRestoreVerified': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, help='Protected encrypted .vlhb artifact downloaded through authorized infrastructure tooling')
    parser.add_argument('--output', required=True, help='New isolated private SQLite destination')
    parser.add_argument('--key-file', help='Optional protected file containing the base64 backup key; otherwise enter it at a hidden prompt')
    args = parser.parse_args()
    try:
        if args.key_file:
            key_file = Path(args.key_file)
            if os.name == 'posix' and key_file.stat().st_mode & 0o077:
                raise ValueError('The backup key file must not be readable by group or other users.')
            key = key_file.read_text().strip()
        else:
            key = getpass.getpass('Backup key, base64 (hidden): ')
        result = restore_hosted_backup(args.input, args.output, key)
    except (ValueError, OSError, sqlite3.Error) as error:
        # Do not echo SQL, rows, usable key material or raw driver error messages.
        parser.exit(1, ('Choose a new isolated output file.' if isinstance(error, FileExistsError) else 'Restore failed. Check the protected key, authenticated artifact and schema compatibility; no existing destination was replaced.') + '\n')
    print(json.dumps(result))


if __name__ == '__main__':
    main()
