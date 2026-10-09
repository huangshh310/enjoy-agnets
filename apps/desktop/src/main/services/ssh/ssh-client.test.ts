import assert from "node:assert/strict"
import { test } from "node:test"
import { expandLocalPath, resolveSshExecutable, resolveWslExecutable } from "./ssh-client.ts"

test("非 Windows 用 ssh；Windows 优先 OpenSSH ssh.exe", () => {
  assert.equal(resolveSshExecutable("darwin", {}), "ssh")
  assert.equal(resolveSshExecutable("linux", {}), "ssh")
  const win = resolveSshExecutable("win32", { SystemRoot: "C:\\Windows" })
  assert.ok(win === "ssh.exe" || win.endsWith("ssh.exe"))
})

test("WSL 可执行文件在 Windows 上指向 wsl.exe", () => {
  const win = resolveWslExecutable("win32", { SystemRoot: "C:\\Windows" })
  assert.ok(win.endsWith("wsl.exe"))
  assert.equal(resolveWslExecutable("linux", {}), "wsl")
})

test("sshClientCwd 不用 process.cwd", async () => {
  const { readFileSync } = await import("node:fs")
  const src = readFileSync(new URL("./ssh-client.ts", import.meta.url), "utf8")
  assert.equal(src.includes("process.cwd()"), false)
})

test("expandLocalPath 展开 ~", () => {
  assert.equal(expandLocalPath("~", "/home/alice"), "/home/alice")
  const unix = expandLocalPath("~/.ssh/id_ed25519", "/home/alice").replaceAll("\\", "/")
  assert.equal(unix, "/home/alice/.ssh/id_ed25519")
  const win = expandLocalPath("~\\.ssh\\id_ed25519", "C:\\Users\\a").replaceAll("\\", "/")
  assert.equal(win.endsWith("id_ed25519"), true)
  assert.ok(win.startsWith("C:/Users/a"))
})
