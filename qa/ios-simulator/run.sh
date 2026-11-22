#!/bin/bash
set -euo pipefail
bundle_id=app.voidline.qa.guestprobe
artifact_dir="$RUNNER_TEMP/voidline-ios-evidence"
mkdir -p "$artifact_dir"
xcodebuild -version
xcrun simctl list devices available --json > "$RUNNER_TEMP/ios-devices.json"
udid=$(python3 - "$RUNNER_TEMP/ios-devices.json" <<'PY'
import json, re, sys
options=[]
for runtime, devices in json.load(open(sys.argv[1]))['devices'].items():
    match=re.fullmatch(r'com\.apple\.CoreSimulator\.SimRuntime\.iOS-(\d+)-(\d+)(?:-(\d+))?',runtime)
    if not match: continue
    version=tuple(int(n or 0) for n in match.groups())
    for device in devices:
        if device.get('isAvailable') and device['name'].startswith('iPhone'):
            options.append((version,'Pro Max' not in device['name'],device['name'],device['udid']))
if not options: sys.exit('No available iPhone simulator is installed')
print(max(options)[-1])
PY
)
echo "$udid" > "$RUNNER_TEMP/voidline-ios-udid"
xcrun simctl boot "$udid" || xcrun simctl list booted | grep -F "$udid"
xcrun simctl bootstatus "$udid" -b
xcrun simctl getenv "$udid" SIMULATOR_MODEL_IDENTIFIER
app="$RUNNER_TEMP/GuestProbe.app"
mkdir -p "$app"
python3 - "$app/Info.plist" "$bundle_id" <<'PY'
import plistlib, sys
with open(sys.argv[1],'wb') as f:
    plistlib.dump(dict(CFBundleIdentifier=sys.argv[2],CFBundleName='GuestProbe',CFBundleDisplayName='VOIDLINE Guest QA',
                       CFBundleExecutable='GuestProbe',CFBundlePackageType='APPL',CFBundleVersion='1',
                       CFBundleShortVersionString='1.0',MinimumOSVersion='16.0',UIDeviceFamily=[1,2],
                       UILaunchScreen={},LSRequiresIPhoneOS=True,CFBundleSupportedPlatforms=['iPhoneSimulator']),f)
PY
sdk=$(xcrun --sdk iphonesimulator --show-sdk-path)
xcrun --sdk iphonesimulator swiftc -parse-as-library -swift-version 5 -sdk "$sdk" \
  -target "$(uname -m)-apple-ios16.0-simulator" -framework UIKit -framework WebKit \
  qa/ios-simulator/GuestProbe.swift -o "$app/GuestProbe"
codesign --force --sign - "$app"
xcrun simctl install "$udid" "$app"
xcrun simctl launch "$udid" "$bundle_id"
documents="$(xcrun simctl get_app_container "$udid" "$bundle_id" data)/Documents"
for ((i=0; i<60; i++)); do
  if [[ -f "$documents/result.json" ]]; then
    cp "$documents/result.json" "$artifact_dir/result.json"
    for img in login art series; do
      if [[ -f "$documents/$img.png" ]]; then cp "$documents/$img.png" "$artifact_dir/"; fi
    done
    cat "$artifact_dir/result.json"
    python3 - "$artifact_dir/result.json" <<'PY'
import json, sys
r=json.load(open(sys.argv[1]))
if r.get('status')!='passed' or set(r.get('checks',{}))!={'login','signup','art','playback','series'}:
    raise SystemExit('Guest UI checks did not complete')
PY
    exit 0
  fi
  sleep 2
done
echo "Guest probe produced no result file." >&2
exit 1
