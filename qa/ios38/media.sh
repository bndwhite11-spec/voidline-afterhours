#!/usr/bin/env bash
set -euo pipefail
udid=$(cat "$RUNNER_TEMP/voidline-ios-udid")
proof="$RUNNER_TEMP/voidline-ios-evidence"
app="$RUNNER_TEMP/MediaProbe.app"
bundle=app.voidline.qa.captureprobe
mkdir -p "$app" "$proof"
sdk=$(xcrun --sdk iphonesimulator --show-sdk-path)
xcrun --sdk iphonesimulator swiftc -parse-as-library -swift-version 5 -sdk "$sdk" -target "$(uname -m)-apple-ios16.4-simulator" qa/ios38/MediaProbe.swift native/ios/Sources/{VoidlinePolicy,MessengerWebView,MessengerScreen}.swift -o "$app/MediaProbe"
python3 - "$app/Info.plist" <<'PY'
import plistlib,sys
with open('native/ios/Resources/Info.plist','rb') as f:data=plistlib.load(f)
assert 'call' in data['NSCameraUsageDescription'] and 'call' in data['NSMicrophoneUsageDescription']
data.update(CFBundleDevelopmentRegion='en',CFBundleName='MediaProbe',CFBundleExecutable='MediaProbe',CFBundleIdentifier='app.voidline.qa.captureprobe',CFBundleVersion='1',CFBundleShortVersionString='1.0',MinimumOSVersion='16.4',UIDeviceFamily=[1,2],CFBundleSupportedPlatforms=['iPhoneSimulator'])
with open(sys.argv[1],'wb') as f:plistlib.dump(data,f)
PY
codesign --force --sign - "$app"
xcrun simctl install "$udid" "$app"
xcrun simctl launch "$udid" "$bundle"
doc="$(xcrun simctl get_app_container "$udid" "$bundle" data)/Documents"
for ((i=0;i<50;i++)); do
  if [[ -f "$doc/media.json" ]]; then
    cp "$doc/media.json" "$proof/"
    cat "$proof/media.json"
    python3 -c 'import json,sys; r=json.load(open(sys.argv[1])); assert r["passed"] and len(r["checks"])==9' "$proof/media.json"
    echo 'PASS nine calls to the exact production capture-policy delegate using real WKSecurityOrigin and WKFrameInfo values.'
    exit 0
  fi
  sleep 2
done
exit 1
