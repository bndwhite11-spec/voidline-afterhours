"""Build VOIDLINE's offline local archive and safe source ZIP with Python 3."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote, urlsplit
import base64
import os
import re
import tempfile
import zipfile

root = Path(__file__).resolve().parent
dist = root / 'dist'
downloads = dist / 'downloads'
downloads.mkdir(exist_ok=True)
prompt_source = root / 'docs' / 'VOIDLINE-MEGA-IMPROVEMENT-8.txt'
if not prompt_source.is_file():
    raise ValueError('Missing the authored improvement prompt.')
prompt_addendum = root / 'docs' / 'VOIDLINE-IMPROVEMENT-9-ADDENDUM.txt'
if not prompt_addendum.is_file():
    raise ValueError('Missing the latest user-clarification addendum.')
(downloads / 'voidline-improvement-prompt.txt').write_text(prompt_source.read_text(encoding='utf-8') + '\n\n' + prompt_addendum.read_text(encoding='utf-8'), encoding='utf-8')
html = (dist / 'index.html').read_text(encoding='utf-8')
inlined_styles = []
inlined_scripts = []


class Attributes(HTMLParser):
    def __init__(self, tag):
        super().__init__(convert_charrefs=True)
        self.attrs = {}
        self.feed(tag)

    def handle_starttag(self, _tag, attrs):
        self.attrs = dict(attrs)

    handle_startendtag = handle_starttag


def local_asset(url):
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc:
        raise ValueError(f'Offline entrypoint references a remote dependency: {url}')
    asset = (dist / unquote(parsed.path).lstrip('/')).resolve()
    if not asset.is_relative_to(dist.resolve()) or not asset.is_file():
        raise ValueError(f'Missing or invalid local dependency: {url}')
    return asset


def inline_link(match):
    tag = match.group(0)
    attrs = Attributes(tag).attrs
    rel = (attrs.get('rel') or '').lower().split()
    if 'manifest' in rel:
        return ''
    href = attrs.get('href')
    if not href:
        return tag
    if 'stylesheet' in rel:
        asset = local_asset(href)
        inlined_styles.append(asset.name)
        css = asset.read_text(encoding='utf-8')
        css = re.sub(r'</style', r'<\\/style', css, flags=re.IGNORECASE)
        media = attrs.get('media')
        if media:
            css = f'@media {media} {{\n{css}\n}}'
        return f'<style data-source="{asset.name}">\n{css}\n</style>'
    if 'icon' in rel:
        asset = local_asset(href)
        mime = 'image/svg+xml' if asset.suffix.lower() == '.svg' else 'image/png'
        data = base64.b64encode(asset.read_bytes()).decode('ascii')
        return f'<link rel="icon" href="data:{mime};base64,{data}">'
    return tag


def inline_script(match):
    tag = match.group(1)
    attrs = Attributes(tag).attrs
    source = attrs.get('src')
    if not source:
        return match.group(0)
    asset = local_asset(source)
    inlined_scripts.append(asset.name)
    js = asset.read_text(encoding='utf-8')
    js = re.sub(r'</script', r'<\\/script', js, flags=re.IGNORECASE)
    script_type = attrs.get('type')
    type_attribute = f' type="{script_type}"' if script_type else ''
    return f'<script{type_attribute} data-source="{asset.name}">\n{js}\n</script>'


def mark_offline(match):
    tag = re.sub(r'\sdata-offline(?:\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+))?', '', match.group(0), flags=re.IGNORECASE)
    return tag[:-1] + ' data-offline="true">'


html = re.sub(r'<template data-feature="[a-z]+">([^<>]*(?:<link[^>]*>|<script[^>]*></script>)\s*)</template>', r'\1', html)
html = re.sub(r'<html\b[^>]*>', mark_offline, html, count=1, flags=re.IGNORECASE)
html = re.sub(r'<link\b[^>]*>', inline_link, html, flags=re.IGNORECASE)
html = re.sub(r'(<script\b[^>]*>)(.*?)</script\s*>', inline_script, html,
              flags=re.IGNORECASE | re.DOTALL)
html = html.replace('href="/install.html', 'href="https://voidline-afterhours.pipedcactus1.chatgpt.site/install.html')
html = html.replace('href="/chats"', 'href="https://voidline-afterhours.pipedcactus1.chatgpt.site/chats"')
html = html.replace('href="/help.html', 'href="https://voidline-afterhours.pipedcactus1.chatgpt.site/help.html')
required_styles = {'capsule-stage.css', 'startup.css', 'mobile.css', 'art-motion.css', 'native-messaging.css', 'native-media.css', 'entry.css', 'home.css', 'cosmetics.css', 'collector.css', 'social.css', 'organize.css', 'profile-media.css','gift-collections.css','profile-looks.css','profiles-panel.css','profile-showcase.css','appearance.css', 'admin.css'}
required_scripts = {'capsule-stage.js', 'feature-loader.js', 'startup.js', 'mobile.js', 'account-export.js', 'theme.js', 'media-validation.js', 'profile-media.js', 'native-media.js', 'native-outbox.js', 'native-timeline.js', 'realtime.js', 'collectible-art.js', 'notifications.js', 'entry.js', 'store.js', 'legacy-import.js', 'home.js', 'cosmetics.js', 'collector.js', 'social.js', 'organize.js', 'gift-collections.js','profile-looks.js','profile-showcase.js','profiles-panel.js', 'admin.js'}
if not required_styles.issubset(inlined_styles) or not required_scripts.issubset(inlined_scripts):
    raise ValueError('The entrypoint must load the production home and explicit archive recovery modules.')
if 'data-offline="true"' not in html:
    raise ValueError('The offline edition flag was not inserted.')

offline_path = downloads / 'voidline-offline.html'
with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=downloads,
                                 prefix='.voidline-offline-', delete=False) as temporary:
    temporary.write(html)
    offline_temporary = Path(temporary.name)
os.replace(offline_temporary, offline_path)

# Archive authored source and migration history. Generated Worker bundles must
# never re-enter the source archive or become embedded recursively.
excluded_names = {'node_modules', '.git', '.wrangler', '.sites-runtime', '.vinext',
                  '__pycache__', '.npmrc', '.pypirc', '.gradle', '.kotlin', '.idea'}
generated_dist_roots = {'server', '.openai', '_appgen_meta', 'crypto', 'pkg'}


def allowed(path):
    relative = path.relative_to(root)
    parts = relative.parts
    if path.is_symlink() or not path.is_file():
        return False
    if any(part in excluded_names for part in parts):
        return False
    if any(part.startswith(('.env', '.dev.vars')) for part in parts) and relative != Path('.env.example'):
        return False
    if any(part.lower() in {'secrets.json', 'credentials.json'} for part in parts):
        return False
    if path.suffix in {'.pyc', '.pyo'} or path.name.startswith('.voidline-'):
        return False
    if path.suffix.lower() in {'.sqlite', '.sqlite3', '.db', '.vlb', '.backup', '.bak', '.log', '.pem', '.key', '.p12', '.pfx', '.jks', '.keystore', '.apk', '.aab', '.ipa', '.mobileprovision', '.p8', '.cer'}:
        return False
    if parts[0] == 'native' and (any(part in {'build', 'out', 'DerivedData'} or part.endswith('.xcodeproj') for part in parts) or path.name in {'local.properties', 'signing.properties', 'LocalSigning.xcconfig'}):
        return False
    if len(parts) > 1 and parts[0] == 'dist' and parts[1] in generated_dist_roots:
        return False
    if len(parts) > 2 and parts[:2] == ('dist', 'art') and (parts[2] == 'studies' or re.fullmatch(r'v[0-9]+', parts[2])):
        return False  # Rebuilt SVG variants; source PNG/JPEG and presentation modules are included.
    if relative == Path('dist/downloads/voidline-source.zip'):
        return False
    if relative == Path('dist/secure-messenger.js'):
        return False
    if relative == Path('dist/passkey-client.js'):
        return False
    return True


sources = set()
for directory in ('dist', 'worker', 'backend', 'db', 'drizzle', 'scripts', 'tests', 'src', 'docs', 'native'):
    for path in (root / directory).rglob('*'):
        if allowed(path):
            sources.add(path)
for name in ('build_offline.py', 'README.txt', 'DEVELOPMENT.txt', 'PERFORMANCE.txt',
             'package.json', 'package-lock.json', 'drizzle.config.ts', '.gitignore', '.env.example', 'requirements-backup.txt',
             '.openai/hosting.json'):
    path = root / name
    if not path.is_file():
        raise ValueError(f'Required source file is missing: {name}')
    if allowed(path):
        sources.add(path)

with tempfile.NamedTemporaryFile(dir=downloads, prefix='.voidline-source-', delete=False) as temporary:
    archive_temporary = Path(temporary.name)
try:
    with zipfile.ZipFile(archive_temporary, 'w', zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(sources):
            archive.write(path, 'VOIDLINE/' + path.relative_to(root).as_posix())
    os.replace(archive_temporary, downloads / 'voidline-source.zip')
finally:
    archive_temporary.unlink(missing_ok=True)

print(f'Offline app: {offline_path.stat().st_size:,} bytes; {len(inlined_styles)} stylesheets and {len(inlined_scripts)} scripts inlined')
print(f'Source ZIP: {(downloads / "voidline-source.zip").stat().st_size:,} bytes; {len(sources)} files')
