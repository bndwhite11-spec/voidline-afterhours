"""Validate iOS source preparation on Linux; this does not compile Swift or sign an IPA."""
import importlib.util
import json
from pathlib import Path
import plistlib
import re
import struct

ROOT = Path(__file__).resolve().parent


def validate_project_plist_setup(spec):
    """Guard the supported XcodeGen target shape, without pretending to run it.

    A target's `info:` block GENERATES a replacement plist; `path` is an
    output, not an input. Use an explicit static INFOPLIST_FILE instead so
    project generation cannot erase required runtime permission descriptions.
    """
    lines = spec.splitlines()
    start = next(i for i, line in enumerate(lines) if line == '  VoidlineApp:')
    body = []
    for line in lines[start + 1:]:
        if line.strip() and len(line) - len(line.lstrip()) <= 2:
            break
        body.append(line)
    target = '\n'.join(body)
    assert not re.search(r'^    info\s*:', target, re.M), \
        'Do not generate over the reviewed static Info.plist with target.info.'
    assert re.search(r'^        INFOPLIST_FILE:\s*Resources/Info\.plist\s*$', target, re.M), \
        'The app target must explicitly use the reviewed static Info.plist.'
    assert re.search(r'^        GENERATE_INFOPLIST_FILE:\s*NO\s*$', target, re.M), \
        'Xcode must not generate a replacement app plist.'


def validate_runtime_plist(info):
    for key in ('NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription',
                'NSPhotoLibraryAddUsageDescription', 'NSMicrophoneUsageDescription'):
        assert isinstance(info.get(key), str) and info[key].strip(), \
            'Required runtime privacy description was lost: ' + key
    assert 'UILaunchScreen' in info, 'Keep the reviewed launch-screen declaration.'
    assert info.get('UISupportedInterfaceOrientations')
    assert info.get('UISupportedInterfaceOrientations~ipad')
    assert info['CFBundleShortVersionString'] == '$(MARKETING_VERSION)'
    assert info['CFBundleVersion'] == '$(CURRENT_PROJECT_VERSION)'


specification = (ROOT / 'project.yml').read_text()
validate_project_plist_setup(specification)
# Regression: the previous path-only generator declaration would erase privacy
# and launch keys when XcodeGen writes its defaults. It must fail preparation.
old_generator = specification.replace('    settings:\n',
    '    info:\n      path: Resources/Info.plist\n    settings:\n', 1)
for broken in (old_generator, specification.replace('        INFOPLIST_FILE: Resources/Info.plist\n', '')):
    try:
        validate_project_plist_setup(broken)
    except AssertionError:
        pass
    else:
        raise AssertionError('A plist replacement or missing static input was not rejected')

info = plistlib.loads((ROOT / 'Resources' / 'Info.plist').read_bytes())
validate_runtime_plist(info)
for key in ('NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription',
            'NSPhotoLibraryAddUsageDescription', 'NSMicrophoneUsageDescription'):
    missing = dict(info)
    del missing[key]
    try:
        validate_runtime_plist(missing)
    except AssertionError:
        pass
    else:
        raise AssertionError('Missing privacy description was not rejected')
entitlements = plistlib.loads((ROOT / 'Resources' / 'VOIDLINE.entitlements').read_bytes())
assert 'NSAppTransportSecurity' not in info, 'No ATS exception should be shipped.'
assert 'NSLocationWhenInUseUsageDescription' not in info
assert info['NSCameraUsageDescription'] and info['NSPhotoLibraryUsageDescription']
assert info['NSMicrophoneUsageDescription']
assert entitlements == {
    'com.apple.developer.associated-domains': [
        'webcredentials:voidline-afterhours.pipedcactus1.chatgpt.site'
    ]
}
spec = importlib.util.spec_from_file_location('ios_prepare', ROOT / 'prepare.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
config, association = module.outputs('ABCD123456')
assert association == {'webcredentials': {'apps': ['ABCD123456.app.voidline.afterhours']}}
assert config.count('DEVELOPMENT_TEAM') == 1
for invalid in ('', 'YOUR_APPLE_TEAM_ID', 'abc1234567', 'ABCD123456\n', 'A' * 100):
    try:
        module.outputs(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError('Invalid team ID accepted')
icon = ROOT / 'Resources' / 'Assets.xcassets' / 'AppIcon.appiconset'
catalog = json.loads((icon / 'Contents.json').read_text())
assert catalog['images'][0]['filename'] == 'AppIcon.png'
data = (icon / 'AppIcon.png').read_bytes()
assert data[:8] == b'\x89PNG\r\n\x1a\n'
assert struct.unpack('>II', data[16:24]) == (1024, 1024)
assert data[25] in (0, 2, 3), 'App icon must not have an alpha channel.'
assert not list(ROOT.rglob('*.ipa')), 'Source preparation must not masquerade as a signed app.'
print('PASS iOS plist/entitlement/icon and public TeamID/AASA-generator checks')
print('PASS static Info.plist preservation and original XcodeGen replacement/privacy regressions')
print('Swift compilation, Xcode generation, codesigning, native UI and device behavior remain unverified.')

