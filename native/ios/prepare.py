"""Generate public signing-team configuration and an AASA candidate; no keys.

Run on the Mac that will sign the app. The generated AASA is only a candidate:
the Site operator must review and publish it on the actual relying-party host.
"""
import argparse
import json
from pathlib import Path
import re

BUNDLE_ID = 'app.voidline.afterhours'


def outputs(team_id):
    if not re.fullmatch(r'[A-Z0-9]{10}', team_id):
        raise ValueError('Use the ten-character Apple Developer Team ID, not a signing certificate or private key.')
    return (
        '// Public Apple team identifier. Signing keys stay in your Mac keychain.\n'
        'DEVELOPMENT_TEAM = ' + team_id + '\n',
        {'webcredentials': {'apps': [team_id + '.' + BUNDLE_ID]}},
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--team-id', required=True)
    args = parser.parse_args()
    configuration, association = outputs(args.team_id)
    root = Path(__file__).resolve().parent
    config = root / 'Config' / 'LocalSigning.xcconfig'
    candidate = root / 'build' / 'site-association' / 'apple-app-site-association'
    candidate.parent.mkdir(parents=True, exist_ok=True)
    config.write_text(configuration)
    candidate.write_text(json.dumps(association, indent=2) + '\n')
    print('Created local signing-team configuration and an unpublished AASA candidate.')
    print('No certificate, key, provisioning profile, app archive or IPA was created.')


if __name__ == '__main__':
    main()

