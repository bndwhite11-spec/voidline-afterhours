#!/usr/bin/env python3
"""Build a signed Android TWA APK; private signing state never enters source."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import secrets
import shutil
import stat
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPOSITORY = ROOT.parent.parent
APP_ID = 'app.voidline.afterhours'
ORIGIN = 'https://voidline-afterhours.pipedcactus1.chatgpt.site'


def run(command, **options):
    result = subprocess.run(command, cwd=ROOT, check=False, **options)
    if result.returncode:
        raise RuntimeError('Android build command failed: ' + str(command[0]))
    return result


def private_file(path, value):
    with path.open('x', encoding='utf-8') as handle:
        os.chmod(path, 0o600)
        handle.write(value)


def verify_private(path):
    if not path.is_file() or path.is_symlink():
        raise RuntimeError('The protected signing file is missing or is a symbolic link.')
    if stat.S_IMODE(path.stat().st_mode) & 0o077:
        raise RuntimeError('Signing files must have mode 600 and remain outside the repository.')


def prepare_signing():
    directory = Path(os.environ.get('VOIDLINE_ANDROID_PRIVATE_DIR', '/workspace/.voidline-private/android')).resolve()
    if directory.is_relative_to(REPOSITORY):
        raise RuntimeError('Signing material must remain outside the source repository.')
    directory.mkdir(parents=True, exist_ok=True)
    directory.chmod(0o700)
    settings_path = directory / 'signing.json'
    keytool = str(Path(os.environ['JAVA_HOME']) / 'bin/keytool') if os.environ.get('JAVA_HOME') else shutil.which('keytool')
    if not keytool:
        raise RuntimeError('A JDK with keytool is required.')
    if not settings_path.exists():
        keystore, password = directory / 'voidline-release.p12', directory / 'release.password'
        if keystore.exists() or password.exists():
            raise RuntimeError('Incomplete signing setup exists. Recover it instead of replacing the application key.')
        private_file(password, secrets.token_urlsafe(48) + '\n')
        run([keytool, '-genkeypair', '-noprompt', '-storetype', 'PKCS12',
             '-keystore', str(keystore), '-storepass:file', str(password),
             '-keypass:file', str(password), '-alias', 'voidline-release',
             '-keyalg', 'RSA', '-keysize', '3072', '-sigalg', 'SHA256withRSA',
             '-validity', '10000', '-dname', 'CN=VOIDLINE Android Release,OU=Afterhours,O=VOIDLINE'],
            capture_output=True)
        keystore.chmod(0o600)
        private_file(settings_path, json.dumps({'keystore': str(keystore), 'passwordFile': str(password), 'alias': 'voidline-release'}, indent=2) + '\n')
    verify_private(settings_path)
    settings = json.loads(settings_path.read_text())
    for field in ['keystore', 'passwordFile']:
        target = Path(settings[field]).resolve()
        if target.is_relative_to(REPOSITORY):
            raise RuntimeError('Signing material must remain outside source.')
        verify_private(target)
    certificate = run([keytool, '-exportcert', '-keystore', settings['keystore'],
                       '-storepass:file', settings['passwordFile'], '-alias', settings['alias']], capture_output=True).stdout
    fingerprint = ':'.join(f'{byte:02X}' for byte in hashlib.sha256(certificate).digest())
    public = {'packageId': APP_ID, 'siteOrigin': ORIGIN, 'sha256CertificateFingerprint': fingerprint,
              'minSdk': 24, 'targetSdk': 36, 'wrapper': 'android-browser-helper:2.7.4'}
    (ROOT / 'release-certificate.json').write_text(json.dumps(public, indent=2) + '\n')
    return settings_path, public


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--prepare-signing', action='store_true', help='Prepare the release key once and print only public certificate metadata.')
    parser.add_argument('--write-locks', action='store_true', help='Resolve the pinned first build and write dependency locks/verification metadata.')
    arguments = parser.parse_args()
    settings, public = prepare_signing()
    if arguments.prepare_signing:
        print(json.dumps(public, indent=2))
        return
    gradle = os.environ.get('VOIDLINE_GRADLE_BIN') or str(ROOT / 'gradlew')
    if not Path(gradle).is_file():
        raise RuntimeError('Install the documented Gradle 8.13 toolchain or use the checked-in wrapper.')
    sdk = Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT', ''))
    tools = sdk / 'build-tools/35.0.0'
    if not (tools / 'apksigner').is_file():
        raise RuntimeError('Android SDK build-tools 35.0.0 are required.')
    version = os.environ.get('VOIDLINE_ANDROID_VERSION_NAME', '1.0.2')
    code = os.environ.get('VOIDLINE_ANDROID_VERSION_CODE', '3')
    if not re.fullmatch(r'[1-9][0-9]{0,8}', code):
        raise RuntimeError('Use a positive Android version code of up to nine digits.')
    if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+(?:[-.][A-Za-z0-9.-]+)?', version):
        raise RuntimeError('Use a semantic Android version name.')
    environment = {**os.environ, 'VOIDLINE_ANDROID_SIGNING_FILE': str(settings)}
    command = [gradle, '--no-daemon', '--console=plain', ':app:assembleRelease']
    if arguments.write_locks:
        command += ['--write-locks', '--write-verification-metadata', 'sha256']
    run(command, env=environment)
    source = ROOT / 'app/build/outputs/apk/release/app-release.apk'
    if not source.is_file():
        raise RuntimeError('The signed release APK was not produced.')
    verification = run([str(tools / 'apksigner'), 'verify', '--verbose', '--print-certs', str(source)], capture_output=True, text=True, env=environment).stdout
    expected = public['sha256CertificateFingerprint'].replace(':', '').lower()
    if expected not in verification.lower():
        raise RuntimeError('The APK was not signed by the preserved release key.')
    badging = run([str(tools / 'aapt'), 'dump', 'badging', str(source)], capture_output=True, text=True, env=environment).stdout
    package = next((line for line in badging.splitlines() if line.startswith('package: ')), '')
    attributes = dict(re.findall(r"([a-zA-Z]+)='([^']*)'", package))
    if (attributes.get('name'), attributes.get('versionName'), attributes.get('versionCode')) != (APP_ID, version, code):
        raise RuntimeError('The signed Android package does not match the requested app ID and version.')
    if 'application-debuggable' in badging:
        raise RuntimeError('The signed Android release is debuggable.')
    if "sdkVersion:'24'" not in badging or "targetSdkVersion:'36'" not in badging:
        raise RuntimeError('Unexpected Android SDK compatibility.')
    run([str(tools / 'zipalign'), '-c', '-P', '16', '4', str(source)], capture_output=True, env=environment)
    output = Path(os.environ.get('VOIDLINE_ANDROID_OUTPUT', '/workspace/voidline-release/android')).resolve()
    output.mkdir(parents=True, exist_ok=True)
    artifact = output / f'VOIDLINE-Afterhours-{version}.apk'
    shutil.copyfile(source, artifact)
    checksum = hashlib.sha256(artifact.read_bytes()).hexdigest()
    (output / (artifact.name + '.sha256')).write_text(checksum + '  ' + artifact.name + '\n')
    metadata = {**public, 'versionName': version, 'versionCode': int(code),
                'file': artifact.name, 'bytes': artifact.stat().st_size, 'sha256': checksum,
                'verified': ['apksigner-signature-and-public-certificate', 'release-not-debuggable', 'package-and-sdk-levels', 'zipalign-16kb'],
                'deviceTesting': 'not-performed'}
    (output / 'android-release.json').write_text(json.dumps(metadata, indent=2) + '\n')
    (output / 'apksigner-verification.txt').write_text(verification)
    print(json.dumps({'artifact': str(artifact), **metadata}, indent=2))


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
