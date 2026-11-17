"""Real encrypted snapshot/restore of the generated schema in isolation."""
import importlib.util
import json
import os
from pathlib import Path
import sqlite3
import tempfile

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('voidline_backup', root / 'scripts/backup-db.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)

with tempfile.TemporaryDirectory(prefix='voidline-backup-test-') as directory:
    folder = Path(directory)
    original, sealed, restored = folder / 'original.sqlite', folder / 'data.vlb', folder / 'restored.sqlite'
    with sqlite3.connect(original) as db:
        db.execute('PRAGMA foreign_keys=ON')
        journal = json.loads((root / 'drizzle/meta/_journal.json').read_text())
        for migration in journal['entries']:
            db.executescript((root / 'drizzle' / (migration['tag'] + '.sql')).read_text())
        db.execute("INSERT INTO live_accounts(id,display_name,email,username,onboarding_complete,created_at,updated_at) VALUES('retained','Backup Person','','backup_person',1,1,1)")
        db.execute("INSERT INTO live_communities(id,name,created_by,created_at) VALUES('retained-community','Existing community','retained',1)")
        db.execute("INSERT INTO live_memberships(community_id,account_id,role,joined_at) VALUES('retained-community','retained','owner',1)")
        db.execute("INSERT INTO live_channels(id,community_id,name,kind,created_at) VALUES('retained-channel','retained-community','general','text',1)")
        db.execute("INSERT INTO live_messages(id,channel_id,author_id,client_id,text,created_at) VALUES('retained-message','retained-channel','retained','stable-test-id','PRIVATE_BACKUP_SENTINEL',2)")
        db.execute("INSERT INTO native_conversations(id,kind,name,created_by,client_id,request_hash,created_at,updated_at) VALUES('retained-native','group','Private backup group','retained','backup-create','hash',1,1)")
        db.execute("INSERT INTO native_members(conversation_id,account_id,joined_at) VALUES('retained-native','retained',1)")
        db.execute("INSERT INTO native_messages(id,conversation_id,author_id,client_id,text,original_hash,created_at) VALUES('native-message','retained-native','retained','native-send','PRIVATE_NATIVE_BACKUP_SENTINEL','hash',2)")
        db.execute('INSERT INTO auth_credentials(account_id,password_hash,salt,algorithm,iterations,recovery_hash,created_at,updated_at) VALUES(?,?,?,?,?,?,1,1)', ('retained', 'f' * 64, 'a' * 64, 'pbkdf2-sha256', 100000, 'e' * 64))
    phrase = 'Offline backup secret ' + os.urandom(32).hex()
    backup.create_backup(original, sealed, phrase)
    assert b'PRIVATE_BACKUP_SENTINEL' not in sealed.read_bytes()
    assert b'PRIVATE_NATIVE_BACKUP_SENTINEL' not in sealed.read_bytes()
    assert sealed.stat().st_mode & 0o777 == 0o600
    backup.restore_backup(sealed, restored, phrase)
    with sqlite3.connect(restored) as db:
        assert db.execute('SELECT text FROM live_messages').fetchone()[0] == 'PRIVATE_BACKUP_SENTINEL'
        assert db.execute('SELECT text FROM native_messages').fetchone()[0] == 'PRIVATE_NATIVE_BACKUP_SENTINEL'
        assert db.execute('SELECT account_id FROM native_members').fetchone()[0] == 'retained'
        assert db.execute('SELECT role FROM live_memberships').fetchone()[0] == 'owner'
        assert db.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []
        assert db.execute('SELECT password_hash FROM auth_credentials').fetchone()[0] == 'f' * 64
    print('PASS actual migrated schema, IDs, membership and message content survive encrypted snapshot/isolated restore')
    for candidate, secret in [(sealed, phrase + 'wrong')]:
        try:
            backup.restore_backup(candidate, folder / 'wrong.sqlite', secret)
            raise AssertionError('Wrong secret accepted')
        except ValueError:
            assert not (folder / 'wrong.sqlite').exists()
    modified = bytearray(sealed.read_bytes())
    modified[-1] ^= 1
    tampered = folder / 'tampered.vlb'
    tampered.write_bytes(modified)
    try:
        backup.restore_backup(tampered, folder / 'tampered.sqlite', phrase)
        raise AssertionError('Modified ciphertext accepted')
    except ValueError:
        assert not (folder / 'tampered.sqlite').exists()
    try:
        backup.restore_backup(sealed, restored, phrase)
        raise AssertionError('Existing restored database overwritten')
    except FileExistsError:
        pass
    print('PASS wrong-key, tamper and accidental-overwrite cases leave the destination unchanged')
print('2/2 backup/restore checks passed. Local SQLite only; hosted D1 export/restore is not claimed.')
