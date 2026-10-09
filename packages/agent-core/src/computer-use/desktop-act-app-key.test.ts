import assert from "node:assert/strict"
import test from "node:test"
import { desktopActIsSensitive, stampDesktopActSensitiveFlag } from "./desktop-act-app-key.ts"

test("系统设置 / 钥匙串 / 支付命中敏感", () => {
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "系统设置", appKey: "com.apple.systempreferences" }),
    true
  )
  assert.equal(desktopActIsSensitive({ action: "click", appName: "钥匙串访问" }), true)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "Alipay" }), true)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "备忘录", appKey: "com.apple.notes" }), false)
})

test("darwin 终端：Terminal / iTerm2 按 bundleId 与显示名命中", () => {
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "终端", appKey: "com.apple.Terminal" }),
    true
  )
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "Terminal", bundleId: "com.apple.Terminal" }),
    true
  )
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "iTerm2", appKey: "com.googlecode.iterm2" }),
    true
  )
  assert.equal(desktopActIsSensitive({ action: "click", appName: "iTerm", appKey: "iTerm" }), true)
})

test("win 终端：Windows Terminal / PowerShell / cmd 按 exe 与稳定名命中", () => {
  assert.equal(
    desktopActIsSensitive({
      action: "click",
      appName: "Windows Terminal",
      appKey: "Microsoft.WindowsTerminal_8wekyb3d8bbwe!App",
      appKeySource: "aumid"
    }),
    true
  )
  assert.equal(
    desktopActIsSensitive({
      action: "click",
      appName: "Windows Terminal",
      exe: "WindowsTerminal.exe",
      appKey: "C:\\Program Files\\WindowsApps\\WindowsTerminal.exe"
    }),
    true
  )
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "Windows PowerShell", appKey: "powershell.exe" }),
    true
  )
  assert.equal(desktopActIsSensitive({ action: "click", appName: "PowerShell", appKey: "pwsh" }), true)
  assert.equal(
    desktopActIsSensitive({
      action: "click",
      appName: "Command Prompt",
      appKey: "C:\\Windows\\System32\\cmd.exe"
    }),
    true
  )
  assert.equal(desktopActIsSensitive({ action: "click", appName: "命令提示符", appKey: "cmd" }), true)
})

test("linux 终端：GNOME Terminal / Konsole / xterm / Alacritty / kitty / WezTerm", () => {
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "GNOME Terminal", appKey: "org.gnome.Terminal" }),
    true
  )
  assert.equal(desktopActIsSensitive({ action: "click", appName: "gnome-terminal" }), true)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "Konsole", appKey: "org.kde.konsole" }), true)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "xterm", appKey: "/usr/bin/xterm" }), true)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "Alacritty" }), true)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "kitty", appKey: "kitty" }), true)
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "WezTerm", appKey: "org.wezfurlong.wezterm" }),
    true
  )
})

test("Finder / Explorer 与普通应用不因终端名单误伤", () => {
  assert.equal(desktopActIsSensitive({ action: "click", appName: "Finder", appKey: "com.apple.finder" }), false)
  assert.equal(
    desktopActIsSensitive({ action: "click", appName: "File Explorer", appKey: "explorer.exe" }),
    false
  )
  assert.equal(desktopActIsSensitive({ action: "click", appName: "文件资源管理器", appKey: "explorer" }), false)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "Android SDK cmdline-tools" }), false)
  assert.equal(desktopActIsSensitive({ action: "click", appName: "备忘录", appKey: "com.apple.notes" }), false)
})

test("stampDesktopActSensitiveFlag 把判定写进 args.sensitive", () => {
  const flagged = stampDesktopActSensitiveFlag({
    action: "click",
    appName: "终端",
    appKey: "com.apple.Terminal"
  })
  assert.equal(flagged.sensitive, true)
  const ordinary = stampDesktopActSensitiveFlag({
    action: "click",
    appName: "备忘录",
    appKey: "com.apple.notes"
  })
  assert.equal(ordinary.sensitive, false)
})
