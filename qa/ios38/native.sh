#!/bin/bash
set -euo pipefail
udid=$(cat "$RUNNER_TEMP/voidline-ios-udid")
app="$RUNNER_TEMP/VOIDLINE.app"
proof="$RUNNER_TEMP/voidline-ios-evidence"
mkdir -p "$app" "$proof"
sdk=$(xcrun --sdk iphonesimulator --show-sdk-path)
xcrun --sdk iphonesimulator swiftc -parse-as-library -swift-version 5 -sdk "$sdk" \
  -target "$(uname -m)-apple-ios16.4-simulator" native/ios/Sources/*.swift -o "$app/VOIDLINE"
python3 - "$app/Info.plist" <<'PY'
import plistlib,sys
with open('native/ios/Resources/Info.plist','rb') as fd:
    data=plistlib.load(fd)
data.update(CFBundleDevelopmentRegion='en',CFBundleName='VOIDLINE',CFBundleExecutable='VOIDLINE',
            CFBundleIdentifier='app.voidline.afterhours',CFBundleVersion='1',
            CFBundleShortVersionString='1.0.0',MinimumOSVersion='16.4',
            UIDeviceFamily=[1,2],CFBundleSupportedPlatforms=['iPhoneSimulator'])
with open(sys.argv[1],'wb') as fd: plistlib.dump(data,fd)
PY
codesign --force --sign - "$app"
xcrun simctl install "$udid" "$app"
xcrun simctl launch "$udid" app.voidline.afterhours
cat > "$RUNNER_TEMP/read-voidline-screen.swift" <<'SWIFT'
import Foundation
import Vision
import Darwin
let url = URL(fileURLWithPath:CommandLine.arguments[1])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
try VNImageRequestHandler(url:url).perform([request])
let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
print(lines.joined(separator:"\n"))
let text = lines.joined(separator:" ").lowercased()
exit(text.contains("password") && (text.contains("create account") || text.contains("welcome back")) ? 0 : 1)
SWIFT
xcrun swiftc "$RUNNER_TEMP/read-voidline-screen.swift" -o "$RUNNER_TEMP/read-voidline-screen"
for ((i=0; i<20; i++)); do
  xcrun simctl io "$udid" screenshot "$proof/native-guest.png"
  if "$RUNNER_TEMP/read-voidline-screen" "$proof/native-guest.png" > "$proof/native-guest-text.txt"; then
    cat "$proof/native-guest-text.txt"
    echo "PASS native SwiftUI wrapper rendered the signed-out account form on iPhone Simulator"
    exit 0
  fi
  sleep 2
done
cat "$proof/native-guest-text.txt"
exit 1
