/**
 * SSH_ASKPASS：把登录密码交给 OpenSSH。密码进 0600 临时文件，不进 ssh argv。
 */
import { randomBytes } from "node:crypto"
import { chmodSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

export type SshAskpassHandle = {
  env: Record<string, string>
  cleanup: () => void
}

const UNIX_HELPER = `#!/bin/sh
prompt="$*"
case "$prompt" in
  *yes/no*) echo yes; exit 0 ;;
esac
if [ -z "$ENJOY_SSH_ASKPASS_FILE" ] || [ ! -f "$ENJOY_SSH_ASKPASS_FILE" ]; then
  exit 1
fi
exec cat "$ENJOY_SSH_ASKPASS_FILE"
`

const WIN_HELPER = `@echo off
echo(%*| findstr /I /C:"yes/no" >nul && (echo yes& exit /b 0)
if not defined ENJOY_SSH_ASKPASS_FILE exit /b 1
type "%ENJOY_SSH_ASKPASS_FILE%"
`

export function prepareSshAskpass(password: string, dir = defaultAskpassDir()): SshAskpassHandle {
  const trimmed = password.trim()
  if (!trimmed) throw new Error("请填写登录密码")
  mkdirSync(dir, { recursive: true, mode: 0o700 })
  const secretFile = join(dir, `${randomBytes(8).toString("hex")}.pass`)
  writeFileSync(secretFile, trimmed, { encoding: "utf8", mode: 0o600 })
  const helper = writeAskpassHelper(dir)
  return {
    env: {
      DISPLAY: process.env.DISPLAY || ":0",
      SSH_ASKPASS: helper,
      SSH_ASKPASS_REQUIRE: "force",
      ENJOY_SSH_ASKPASS_FILE: secretFile
    },
    cleanup: () => {
      try {
        unlinkSync(secretFile)
      } catch {
        /* 探测结束即删 */
      }
    }
  }
}

export function defaultAskpassDir(): string {
  try {
    const electron = require("electron") as { app?: { getPath: (name: string) => string } }
    if (electron.app) return join(electron.app.getPath("userData"), "ssh-askpass")
  } catch {
    /* node:test 无 electron */
  }
  return join(tmpdir(), "enjoy-ssh-askpass")
}

function writeAskpassHelper(dir: string): string {
  const isWin = process.platform === "win32"
  const helper = join(dir, isWin ? "askpass.cmd" : "askpass.sh")
  writeFileSync(helper, isWin ? WIN_HELPER : UNIX_HELPER, { encoding: "utf8", mode: 0o700 })
  if (!isWin) chmodSync(helper, 0o700)
  return helper
}
