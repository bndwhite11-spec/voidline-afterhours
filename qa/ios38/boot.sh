#!/bin/bash
set -euo pipefail
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
