$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$origin = 'https://voidline-afterhours.pipedcactus1.chatgpt.site'
$dir = Join-Path $env:RUNNER_TEMP 'voidline-native-smoke'
New-Item -Path $dir -ItemType Directory -Force | Out-Null
$spec = Invoke-RestMethod "$origin/downloads/voidline-release.json"
$zip = Join-Path $dir 'windows.zip'
curl.exe -fsSL --retry 2 "$origin/downloads/VOIDLINE-Windows-x64.zip" -o $zip
if ($LASTEXITCODE -ne 0 -or (Get-FileHash $zip -Algorithm SHA256).Hash -ne $spec.windows.sha256 -or (Get-Item $zip).Length -ne $spec.windows.bytes) { throw 'Windows portable ZIP download or SHA-256 failed' }
tar.exe -xf $zip -C $dir
if ($LASTEXITCODE -ne 0) { throw 'Windows archive extraction failed' }
$exe = Join-Path $dir 'VOIDLINE-win32-x64/VOIDLINE.exe'
Add-Type -AssemblyName UIAutomationClient,UIAutomationTypes,System.Windows.Forms
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class VoidlineInput {
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
  [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
}
'@
$proc = Start-Process -FilePath $exe -ArgumentList "--force-renderer-accessibility" -PassThru
try {
  $limit = (Get-Date).AddSeconds(95)
  $names = @()
  do {
    if ($proc.HasExited) { throw "VOIDLINE exited with code $($proc.ExitCode)" }
    $proc.Refresh()
    if ($proc.MainWindowHandle -ne [IntPtr]::Zero) {
      $window = [System.Windows.Automation.AutomationElement]::FromHandle($proc.MainWindowHandle)
      $controls = $window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition)
      $names = @($controls | ForEach-Object { $_.Current.Name })
      if ($names -contains 'Create account' -and $names -contains 'Log in') { break }
    }
    Start-Sleep -Milliseconds 750
  } while ((Get-Date) -lt $limit)
  if (!($names -contains 'Create account') -or !($names -contains 'Log in')) { throw ('Live sign-in controls missing from the Windows window. Accessible names: '+(($names | Select-Object -Unique -First 38) -join ', ')) }
  $startOnRegister = $names -contains 'Create your account'
  $nextButton = if ($startOnRegister) { 'Log in' } else { 'Create account' }
  $expected = if ($startOnRegister) { 'Welcome back' } else { 'Create your account' }
  $register = $controls | Where-Object { $_.Current.Name -eq $nextButton -and $_.Current.ControlType -eq [System.Windows.Automation.ControlType]::Button } | Select-Object -First 1
  if (!$register) { throw 'Credential view switching button missing' }
  Write-Host "WINDOWS NATIVE READY: live sign-in and registration controls found in published executable."
  $null = [VoidlineInput]::SetForegroundWindow($proc.MainWindowHandle)
  $solved = $false
  foreach ($method in @('keyboard','pointer')) {
    if ($method -eq 'keyboard') {
      try {
        $register.SetFocus()
        [System.Windows.Forms.SendKeys]::SendWait(' ')
      } catch { Write-Host 'Accessible focus unavailable; continuing to native pointer' }
    } else {
      $box = $register.Current.BoundingRectangle
      if ($box.Width -le 0 -or $box.Height -le 0 -or $register.Current.IsOffscreen) { throw 'Target control has no visible click area' }
      $x = [int]($box.Left + $box.Width/2)
      $y = [int]($box.Top + $box.Height/2)
      if (!([VoidlineInput]::SetCursorPos($x, $y))) { throw 'Unable to target credential view switching control' }
      [VoidlineInput]::mouse_event(2,0,0,0,[UIntPtr]::Zero)
      [VoidlineInput]::mouse_event(4,0,0,0,[UIntPtr]::Zero)
    }
    $limit = (Get-Date).AddSeconds(5)
    do {
      $names = @($window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition) | ForEach-Object { $_.Current.Name })
      if ($names -contains $expected) { $solved=$true; break }
      Start-Sleep -Milliseconds 300
    } while ((Get-Date) -lt $limit)
    if ($solved) { Write-Host "Interactive control verified with $method input"; break }
  }
  if (!($names -contains $expected)) { throw 'Switching from the sign-in controls to registration did not render the intended form' }
  Write-Host "WINDOWS NATIVE PASS: launch, actual login controls, interactive account form, shell v$($spec.windows.version); release $($spec.tag). No account created."
} finally {
  if (!$proc.HasExited) { Stop-Process -Id $proc.Id -Force }
}
