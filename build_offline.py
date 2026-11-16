"""Build the standalone HTML app and source ZIP with Python 3; no dependencies."""
from pathlib import Path
import base64
import zipfile

root = Path(__file__).resolve().parent
dist = root / 'dist'
downloads = dist / 'downloads'
downloads.mkdir(exist_ok=True)
html = (dist / 'index.html').read_text()
styles = ['styles.css','entrance.css','badges.css','profiles.css']
scripts = ['entrance.js','badges.js','profiles.js','app.js']
icon = base64.b64encode((dist / 'icon.svg').read_bytes()).decode()
html = html.replace('<html lang="en">', '<html lang="en" data-offline="true">')
html = html.replace('href="icon.svg"', 'href="data:image/svg+xml;base64,' + icon + '"')
html = html.replace('<link rel="manifest" href="manifest.webmanifest">\n', '')
for name in styles:
    css = (dist / name).read_text()
    html = html.replace(f'<link rel="stylesheet" href="{name}">', '<style>\n' + css + '\n</style>')
for name in scripts:
    js = (dist / name).read_text()
    html = html.replace(f'<script src="{name}"></script>', '<script>\n' + js.replace('</script', '<\\/script') + '\n</script>')
(downloads / 'voidline-offline.html').write_text(html)

with zipfile.ZipFile(downloads / 'voidline-source.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(dist.rglob('*')):
        if path.is_file() and path.name != 'voidline-source.zip':
            archive.write(path, 'VOIDLINE/' + str(path.relative_to(root)))
    for path in sorted((root / 'tests').glob('*.cjs')):
        archive.write(path, 'VOIDLINE/' + str(path.relative_to(root)))
    for name in ('build_offline.py', 'README.txt'):
        archive.write(root / name, 'VOIDLINE/' + name)
print(f'Offline app: {len(html.encode()):,} bytes')
print(f'Source ZIP: {(downloads / "voidline-source.zip").stat().st_size:,} bytes')
