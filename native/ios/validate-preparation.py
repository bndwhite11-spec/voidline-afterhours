"""Validate iOS source preparation on Linux; this does not compile Swift or sign an IPA."""
import importlib.util
import json
from pathlib import Path
import plistlib
import struct

ROOT = Path(__file__).resolve().parent

info = plistlib.loads((ROOT / 'Resources' / 'Info.plist').read_bytes())
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
print('Swift compilation, Xcode generation, codesigning, native UI and device behavior remain unverified.')

