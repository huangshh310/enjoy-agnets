# Windows Computer Use 执行器：UIA Invoke / Toggle / Value / Scroll，不用 SendInput。
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class EnjoyIntegrity {
  const int TokenIntegrityLevel = 25;
  [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(uint access, bool inherit, int pid);
  [DllImport("advapi32.dll", SetLastError=true)] static extern bool OpenProcessToken(IntPtr proc, uint access, out IntPtr token);
  [DllImport("advapi32.dll", SetLastError=true)] static extern bool GetTokenInformation(IntPtr token, int cls, IntPtr buf, int len, out int ret);
  [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool PostMessage(IntPtr h, uint msg, int w, int l);
  public static int Rid(int pid) {
    IntPtr proc = OpenProcess(0x1000, false, pid);
    if (proc == IntPtr.Zero) return -1;
    IntPtr token;
    if (!OpenProcessToken(proc, 0x0008, out token)) { CloseHandle(proc); return -1; }
    int len;
    GetTokenInformation(token, TokenIntegrityLevel, IntPtr.Zero, 0, out len);
    IntPtr buf = Marshal.AllocHGlobal(len);
    int rid = -1;
    if (GetTokenInformation(token, TokenIntegrityLevel, buf, len, out len)) {
      IntPtr sid = Marshal.ReadIntPtr(buf, IntPtr.Size == 8 ? 8 : 4);
      int count = Marshal.ReadByte(sid, 1);
      rid = Marshal.ReadInt32(sid, 8 + 4 * (count - 1));
    }
    Marshal.FreeHGlobal(buf);
    CloseHandle(token);
    CloseHandle(proc);
    return rid;
  }
}
"@

function Write-Ok($id, $obj) {
  $payload = @{ id = $id; result = $obj } | ConvertTo-Json -Compress -Depth 8
  [Console]::Out.WriteLine($payload)
}
function Write-Err($id, $code, $message) {
  $payload = @{ id = $id; error = @{ code = $code; message = $message } } | ConvertTo-Json -Compress -Depth 5
  [Console]::Out.WriteLine($payload)
}

function Get-TopWindows {
  $root = [System.Windows.Automation.AutomationElement]::RootElement
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $items = @()
  $child = $walker.GetFirstChild($root)
  while ($null -ne $child) {
    $items += $child
    $child = $walker.GetNextSibling($child)
  }
  return $items
}

function Get-WindowsForPid($targetPid) {
  $all = Get-TopWindows
  if ($targetPid -gt 0) { return @($all | Where-Object { $_.Current.ProcessId -eq $targetPid }) }
  return @($all)
}

function Get-ChildAt($element, $index) {
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $child = $walker.GetFirstChild($element)
  $i = 0
  while ($null -ne $child) {
    if ($i -eq $index) { return $child }
    $child = $walker.GetNextSibling($child)
    $i++
  }
  return $null
}

function Get-ElementByPath($targetPid, $path) {
  $parts = @()
  if ($path) { $parts = $path.Split(".") | ForEach-Object { [int]$_ } }
  if ($parts.Count -eq 0) { return $null }
  $wins = Get-WindowsForPid $targetPid
  if ($parts[0] -ge $wins.Count) { return $null }
  $current = $wins[$parts[0]]
  for ($i = 1; $i -lt $parts.Count; $i++) {
    $current = Get-ChildAt $current $parts[$i]
    if ($null -eq $current) { return $null }
  }
  return $current
}

function Collect-Tree($element, $path, $depth, $acc) {
  if ($acc.Count -ge 80 -or $depth -gt 6) { return }
  $name = $element.Current.Name
  if ($name) {
    $acc.Add(@{
      id = $path
      role = [string]$element.Current.ControlType.ProgrammaticName
      name = $name
      clickable = $true
    }) | Out-Null
  }
  $walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
  $child = $walker.GetFirstChild($element)
  $i = 0
  while ($null -ne $child -and $i -lt 24) {
    Collect-Tree $child ($path + "." + $i) ($depth + 1) $acc
    $child = $walker.GetNextSibling($child)
    $i++
  }
}

function Test-Integrity($targetPid) {
  $self = [EnjoyIntegrity]::Rid([Diagnostics.Process]::GetCurrentProcess().Id)
  $target = [EnjoyIntegrity]::Rid($targetPid)
  if ($target -lt 0 -or ($self -ge 0 -and $target -gt $self)) { return $false }
  return $true
}

function Invoke-Pattern($el, $action, $params) {
  $invoke = $null
  $toggle = $null
  $value = $null
  $scroll = $null
  if ($action -eq "click" -and $el.TryGetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern, [ref]$invoke)) {
    $invoke.Invoke(); return $true
  }
  if ($action -eq "click" -and $el.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$toggle)) {
    $toggle.Toggle(); return $true
  }
  if ($action -eq "type" -and $el.TryGetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern, [ref]$value)) {
    if (-not $value.Current.IsReadOnly) { $value.SetValue([string]$params.text); return $true }
  }
  if ($action -eq "scroll" -and $el.TryGetCurrentPattern([System.Windows.Automation.ScrollPattern]::Pattern, [ref]$scroll)) {
    $dy = 1
    if ($null -ne $params.dy) { $dy = [double]$params.dy }
    if ($dy -lt 0) { $scroll.ScrollVertical([System.Windows.Automation.ScrollAmount]::SmallDecrement) }
    else { $scroll.ScrollVertical([System.Windows.Automation.ScrollAmount]::SmallIncrement) }
    return $true
  }
  return $false
}

function Vk-Of($key) {
  switch ($key) {
    "return" { return 0x0D }
    "enter" { return 0x0D }
    "tab" { return 0x09 }
    "escape" { return 0x1B }
    "esc" { return 0x1B }
    "space" { return 0x20 }
    "left" { return 0x25 }
    "up" { return 0x26 }
    "right" { return 0x27 }
    "down" { return 0x28 }
    default {
      if ($key.Length -eq 1) { return [int][char]$key.ToUpper() }
      return -1
    }
  }
}

function Send-WinKey($hwnd, $combo) {
  $parts = @($combo.ToLower().Split("+"))
  $vk = Vk-Of $parts[-1]
  if ($vk -lt 0) { return $false }
  $mods = @()
  if ($parts -contains "ctrl" -or $parts -contains "control") { $mods += 0x11 }
  if ($parts -contains "shift") { $mods += 0x10 }
  if ($parts -contains "alt") { $mods += 0x12 }
  foreach ($m in $mods) { [void][EnjoyIntegrity]::PostMessage($hwnd, 0x100, $m, 0) }
  [void][EnjoyIntegrity]::PostMessage($hwnd, 0x100, $vk, 0)
  [void][EnjoyIntegrity]::PostMessage($hwnd, 0x101, $vk, 0)
  foreach ($m in $mods) { [void][EnjoyIntegrity]::PostMessage($hwnd, 0x101, $m, 0) }
  return $true
}

function Handle-Act($req) {
  $params = $req.params
  $action = [string]$params.action
  if ($action -eq "wait") {
    $ms = 0
    if ($null -ne $params.waitMs) { $ms = [Math]::Min([int]$params.waitMs, 5000) }
    if ($ms -gt 0) { Start-Sleep -Milliseconds $ms }
    Write-Ok $req.id @{ delivery = "background" }
    return
  }
  $targetPid = 0
  if ($null -ne $params.pid) { $targetPid = [int]$params.pid }
  if ($targetPid -gt 0 -and -not (Test-Integrity $targetPid)) {
    Write-Err $req.id "integrity_blocked" "Target window is at a higher integrity level."
    return
  }
  $allow = $false
  if ($params.allowForeground -eq $true) { $allow = $true }
  if ($action -eq "move" -or $action -eq "drag") {
    if (-not $allow) { Write-Err $req.id "needs_foreground" "This action needs the window in the foreground."; return }
  }
  if ($action -eq "key") {
    if (-not $allow) { Write-Err $req.id "needs_foreground" "Key events need the window in the foreground."; return }
  }
  $el = Get-ElementByPath $targetPid ([string]$params.elementId)
  if ($null -eq $el -and $action -ne "key") { Write-Err $req.id "stale_observation" "Element is not in this snapshot."; return }
  $want = [string]$params.elementName
  if ($el -and $want -and $el.Current.Name -ne $want) { Write-Err $req.id "stale_observation" "Element name no longer matches."; return }
  if ($action -eq "key") {
    $hwnd = [IntPtr]::Zero
    if ($el) { $hwnd = [IntPtr]$el.Current.NativeWindowHandle }
    if ($hwnd -eq [IntPtr]::Zero) { $hwnd = [EnjoyIntegrity]::GetForegroundWindow() }
    [void][EnjoyIntegrity]::SetForegroundWindow($hwnd)
    if (-not (Send-WinKey $hwnd ([string]$params.key))) { Write-Err $req.id "unknown_key" "Unknown key."; return }
    Write-Ok $req.id @{ delivery = "foreground" }
    return
  }
  if (Invoke-Pattern $el $action $params) { Write-Ok $req.id @{ delivery = "background" }; return }
  if (-not $allow) { Write-Err $req.id "needs_foreground" "No UIA pattern for a background action."; return }
  [void][EnjoyIntegrity]::SetForegroundWindow([IntPtr]$el.Current.NativeWindowHandle)
  Start-Sleep -Milliseconds 150
  if (Invoke-Pattern $el $action $params) { Write-Ok $req.id @{ delivery = "foreground" }; return }
  Write-Err $req.id "action_failed" "No UIA pattern after foreground."
}

while ($line = [Console]::In.ReadLine()) {
  if (-not $line) { continue }
  $req = $line | ConvertFrom-Json
  switch ($req.method) {
    "doctor" {
      $rid = [EnjoyIntegrity]::Rid([Diagnostics.Process]::GetCurrentProcess().Id)
      $elevated = $rid -ge 0x3000
      Write-Ok $req.id @{ backgroundClick = $true; elevated = $elevated; integrity = $rid }
    }
    "list_apps" {
      $apps = @()
      $fg = [EnjoyIntegrity]::GetForegroundWindow()
      foreach ($win in Get-TopWindows) {
        $apps += @{
          pid = $win.Current.ProcessId
          name = $win.Current.Name
          frontmost = ([IntPtr]$win.Current.NativeWindowHandle -eq $fg)
          backgroundClick = $true
        }
      }
      Write-Ok $req.id @{ apps = $apps }
    }
    "snapshot" {
      $targetPid = 0
      if ($null -ne $req.params.pid) { $targetPid = [int]$req.params.pid }
      $wins = Get-WindowsForPid $targetPid
      $acc = New-Object System.Collections.Generic.List[object]
      $i = 0
      foreach ($win in $wins) {
        if ($i -ge 4) { break }
        Collect-Tree $win ([string]$i) 0 $acc
        $i++
      }
      $appName = "windows"
      if ($wins.Count -gt 0) { $appName = $wins[0].Current.Name }
      $obsPid = $targetPid
      if ($obsPid -eq 0 -and $wins.Count -gt 0) { $obsPid = $wins[0].Current.ProcessId }
      Write-Ok $req.id @{ observation = @{
        id = "obs_win"; pid = $obsPid; windowId = "$obsPid"; appName = $appName
        elements = $acc; createdAt = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds(); platform = "win32"
      }}
    }
    "act" { Handle-Act $req }
    "screenshot" { Write-Err $req.id "screenshot_unavailable" "Host captures thumbnails." }
    default { Write-Err $req.id "unknown_method" $req.method }
  }
}
