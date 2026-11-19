import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';
import { flipFuses, getCurrentFuseWire, FuseVersion, FuseV1Options, FuseState } from '@electron/fuses';
import { extractFile, listPackage } from '@electron/asar';

const here = path.dirname(fileURLToPath(import.meta.url));
const ELECTRON = '45.4.1';
const INPUT_NAME = `electron-v${ELECTRON}-win32-x64.zip`;
const INPUT_SHA256 = '2ba6223afa9121f42831fefe92c434334907540165294fc56697449d12e7cfe9';
const cache = process.env.VOIDLINE_DESKTOP_CACHE || '/workspace/.voidline-desktop-tools';
const output = process.env.VOIDLINE_DESKTOP_OUTPUT || '/workspace/voidline-release/desktop';
const sha256 = data => createHash('sha256').update(data).digest('hex');
await fs.mkdir(cache, { recursive: true });
await fs.mkdir(output, { recursive: true });
const input = path.join(cache, INPUT_NAME);
try { await fs.access(input); }
catch {
  const temporary = `${input}.partial`;
  execFileSync('curl', ['--fail', '--location', '--retry', '3', '--silent', '--show-error', `https://github.com/electron/electron/releases/download/v${ELECTRON}/${INPUT_NAME}`, '-o', temporary], { stdio: 'inherit' });
  if (sha256(await fs.readFile(temporary)) !== INPUT_SHA256) throw new Error('Official Electron archive checksum mismatch');
  await fs.rename(temporary, input);
}
if (sha256(await fs.readFile(input)) !== INPUT_SHA256) throw new Error('Cached Electron archive checksum mismatch');

const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'voidline-windows-'));
try {
  const appDir = path.join(staging, 'app');
  await fs.mkdir(appDir);
  for (const filename of ['main.cjs', 'offline.html', 'offline.css']) await fs.copyFile(path.join(here, filename), path.join(appDir, filename));
  await fs.writeFile(path.join(appDir, 'package.json'), JSON.stringify({ name: 'voidline-desktop', productName: 'VOIDLINE', version: '1.0.0', main: 'main.cjs' }, null, 2) + '\n');
  // A standards-compliant PNG-backed ICO retains the existing authored app art.
  const png = await fs.readFile(path.join(here, '../../dist/icons/icon-192.png'));
  if (png.readUInt32BE(16) !== 192 || png.readUInt32BE(20) !== 192) throw new Error('Expected reviewed 192px app icon');
  const icoHeader = Buffer.alloc(22);
  icoHeader.writeUInt16LE(1, 2); icoHeader.writeUInt16LE(1, 4);
  icoHeader[6] = 192; icoHeader[7] = 192;
  icoHeader.writeUInt16LE(1, 10); icoHeader.writeUInt16LE(32, 12);
  icoHeader.writeUInt32LE(png.length, 14); icoHeader.writeUInt32LE(22, 18);
  const icon = path.join(staging, 'voidline.ico');
  await fs.writeFile(icon, Buffer.concat([icoHeader, png]));
  const [directory] = await packager({
    dir: appDir, out: staging, name: 'VOIDLINE', executableName: 'VOIDLINE',
    platform: 'win32', arch: 'x64', electronVersion: ELECTRON, electronZipDir: cache,
    appVersion: '1.0.0', buildVersion: '1.0.0', icon,
    asar: true, prune: false, overwrite: true, quiet: true,
    win32metadata: { CompanyName: 'VOIDLINE', ProductName: 'VOIDLINE: AFTERHOURS', FileDescription: 'VOIDLINE desktop messenger' }
  });
  const executable = path.join(directory, 'VOIDLINE.exe');
  const archive = path.join(directory, 'resources/app.asar');
  const archiveFiles = listPackage(archive).map(name => name.replace(/^\//, '')).sort();
  const expectedFiles = ['main.cjs', 'offline.css', 'offline.html', 'package.json'];
  if (JSON.stringify(archiveFiles) !== JSON.stringify(expectedFiles)) throw new Error('Unexpected files in the packaged application');
  for (const filename of expectedFiles) {
    if (!extractFile(archive, filename).equals(await fs.readFile(path.join(appDir, filename)))) throw new Error(`Packaged ${filename} does not match reviewed source`);
  }
  const fuses = {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: true,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false
  };
  await flipFuses(executable, fuses);
  const actualFuses = await getCurrentFuseWire(executable);
  for (const [key, expected] of Object.entries(fuses)) {
    if (key === 'version') continue;
    if (actualFuses[key] !== (expected ? FuseState.ENABLE : FuseState.DISABLE)) throw new Error(`Fuse ${key} was not applied`);
  }
  const exe = await fs.readFile(executable);
  if (exe.toString('ascii', 0, 2) !== 'MZ') throw new Error('Missing Windows executable');
  const pe = exe.readUInt32LE(0x3c);
  if (exe.toString('ascii', pe, pe + 4) !== 'PE\0\0' || exe.readUInt16LE(pe + 4) !== 0x8664) throw new Error('Expected Windows x64 PE executable');
  const readme = `VOIDLINE for Windows x64 — 1.0.0\r\n\r\nExtract the entire ZIP into a folder, then open VOIDLINE.exe. Keep the DLLs and resources beside it. Windows 10 or later is required. This portable distribution needs no setup wizard.\r\n\r\nThe app connects to https://voidline-afterhours.pipedcactus1.chatgpt.site/ and needs internet for the live service. Accounts and messages use the existing service. This wrapper adds no encryption claims. Cookies and cached data stay in the user's normal per-app Windows profile, not inside this folder.\r\n\r\nThis first release has no publisher Authenticode certificate and no automatic updater. Windows can show an unknown-publisher warning. Obtain updates from the project's official releases and check SHA256SUMS. Do not bypass organization policy. Browser-only Google sign-in/passkey/device capabilities require Windows testing; use Open VOIDLINE in browser from the app menu if your provider requires the system browser.\r\n\r\nAudio-only microphone and desktop notifications require an explicit native approval for this session. Revoke permissions in the desktop menu (this reloads the app and stops active microphone tracks). Camera, screen capture, location, USB and other special permissions are denied. Attachments use the native file picker and a Save dialog; downloaded files never execute automatically.\r\n\r\nBuilt on Linux from the pinned official Electron ${ELECTRON} Windows x64 distribution. Package structure, PE architecture, hardened fuses, and mocked main-process security behavior were checked. Execution, SmartScreen, accessibility, login, passkeys, audio, notification delivery and downloads on a real Windows device have not been verified.\r\n`;
  await fs.writeFile(path.join(directory, 'READ-ME-FIRST.txt'), readme);
  const zipPath = path.join(output, 'VOIDLINE-Windows-x64.zip');
  await fs.rm(zipPath, { force: true });
  execFileSync('zip', ['-q', '-r', zipPath, path.basename(directory)], { cwd: path.dirname(directory) });
  execFileSync('unzip', ['-tq', zipPath], { stdio: 'inherit' });
  const zip = await fs.readFile(zipPath);
  const manifest = {
    application: 'VOIDLINE: AFTERHOURS', version: '1.0.0', platform: 'Windows', arch: 'x64', minimumOS: 'Windows 10',
    filename: path.basename(zipPath), bytes: zip.length, sha256: sha256(zip), electronVersion: ELECTRON,
    upstreamUrl: `https://github.com/electron/electron/releases/download/v${ELECTRON}/${INPUT_NAME}`, upstreamSha256: INPUT_SHA256,
    authenticodeSigned: false, automaticUpdates: false, windowsExecutionVerified: false,
    appOrigin: 'https://voidline-afterhours.pipedcactus1.chatgpt.site',
    security: { sandbox: true, contextIsolation: true, nodeIntegration: false, preload: false, hardenedFuses: true, asarIntegrity: true }
  };
  await fs.writeFile(path.join(output, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await fs.writeFile(path.join(output, 'SHA256SUMS'), `${manifest.sha256}  ${manifest.filename}\n`);
  console.log(JSON.stringify(manifest, null, 2));
} finally { await fs.rm(staging, { recursive: true, force: true }); }
