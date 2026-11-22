#!/usr/bin/env bash
set -euo pipefail
pkg=app.voidline.afterhours
origin=https://voidline-afterhours.pipedcactus1.chatgpt.site
evidence="$RUNNER_TEMP/voidline-android"
mkdir -p "$evidence"
adb shell getprop ro.build.fingerprint
adb install -r "$RUNNER_TEMP/VOIDLINE-Android.apk"
adb shell dumpsys package "$pkg" > "$evidence/package"
grep 'versionName=1.0.3' "$evidence/package"
grep 'versionCode=4' "$evidence/package"
adb shell pm path com.android.chrome | grep '^package:'
adb shell dumpsys package com.android.chrome > "$evidence/chrome-package"
grep -m1 versionName "$evidence/chrome-package"
adb shell input keyevent KEYCODE_WAKEUP
adb shell wm dismiss-keyguard
# Allow Chrome to consume test flags on this disposable Android user build.
adb shell am force-stop com.android.chrome
adb shell am set-debug-app --persistent com.android.chrome
printf '%s\n' 'chrome --disable-fre --no-first-run --no-default-browser-check --disable-search-engine-choice-screen --remote-debugging-socket-name=chrome_devtools_remote' > "$evidence/chrome-command-line"
adb push "$evidence/chrome-command-line" /data/local/tmp/chrome-command-line
adb shell chmod 644 /data/local/tmp/chrome-command-line
adb logcat -c
adb shell am force-stop "$pkg"
adb shell am start -W -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n "$pkg/.LauncherActivity" | tee "$evidence/launch"
grep -F 'Status: ok' "$evidence/launch"
for attempt in $(seq 1 20); do
  adb logcat -d -s ActivityTaskManager:I AndroidRuntime:E > "$evidence/launch-log"
  adb shell dumpsys activity activities > "$evidence/activities"
  if grep -E 'START .*android.intent.action.VIEW.*com.android.chrome' "$evidence/launch-log" >/dev/null || grep -E 'Intent \{.*android.intent.action.VIEW.*com.android.chrome' "$evidence/activities" >/dev/null; then break; fi
  sleep 1
done
if grep -E 'Process: app\.voidline\.afterhours([,:]|$)' "$evidence/launch-log"; then echo 'Native launcher crashed'; exit 1; fi
grep -E 'START .*android.intent.action.VIEW.*com.android.chrome|Intent \{.*android.intent.action.VIEW.*com.android.chrome' "$evidence/launch-log" "$evidence/activities" | head -6 > "$evidence/handoff" || true
test -s "$evidence/handoff" || { echo 'No browser handoff observed'; tail -25 "$evidence/launch-log"; exit 1; }
cat "$evidence/handoff"
echo 'PASS signed APK installed and launched; native launcher handed off to Chrome.'
# Chrome's first-run consent UI is native, outside the remote-debugging target.
# Dismiss the common setup controls on a disposable, clean emulator only.
for attempt in $(seq 1 10); do
  adb shell uiautomator dump /sdcard/voidline-ui.xml >/dev/null 2>&1 || true
  adb exec-out cat /sdcard/voidline-ui.xml > "$evidence/ui.xml" || true
  point=$(python3 - "$evidence/ui.xml" <<'PY'
import re,sys,xml.etree.ElementTree as et
try: nodes=list(et.parse(sys.argv[1]).getroot().iter('node'))
except et.ParseError: nodes=[]
choices=['Use without an account','Use Chrome without an account','Continue without an account','Continue without signing in','Accept & continue','No thanks','Skip','Got it','More','Use as default']
for choice in choices:
 for node in nodes:
  if choice.casefold() not in (node.get('text','').strip().casefold(),node.get('content-desc','').strip().casefold()): continue
  xy=list(map(int,re.findall(r'\d+', node.get('bounds',''))))
  if len(xy)==4:
   print((xy[0]+xy[2])//2,(xy[1]+xy[3])//2);sys.exit()
PY
)
  if [[ -z "$point" ]]; then
    if adb shell dumpsys activity activities | grep 'mResumed.*FirstRunActivity' >/dev/null; then
      python3 -c "import re; print(re.findall(r'text=\"([^\"]+)\"',open('$evidence/ui.xml').read())[:15])"
      sleep 2
      continue
    fi
    break
  fi
  read -r x y <<< "$point"
  adb shell input tap "$x" "$y"
  sleep 1
done
adb shell am start -W -a android.intent.action.VIEW -p com.android.chrome -d "$origin/art-review.html?item=gift-copium-cartridge"
adb shell cat /proc/net/unix | grep devtools || true
adb forward tcp:19222 localabstract:chrome_devtools_remote
node --experimental-websocket qa/playback/android.mjs
adb logcat -d -s AndroidRuntime:E > "$evidence/androidruntime"
if grep -E 'Process: app\.voidline\.afterhours([,:]|$)' "$evidence/androidruntime"; then echo 'Native launcher crashed'; exit 1; fi
