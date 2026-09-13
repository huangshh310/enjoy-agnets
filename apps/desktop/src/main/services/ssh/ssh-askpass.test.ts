import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { prepareSshAskpass } from "./ssh-askpass.ts"

test("askpass 从 0600 文件吐出密码，用完即删；yes/no 回 yes", () => {
  const dir = mkdtempSync(join(tmpdir(), "enjoy-askpass-"))
  try {
    const handle = prepareSshAskpass("s3cret", dir)
    assert.equal(handle.env.SSH_ASKPASS_REQUIRE, "force")
    const secret = readFileSync(handle.env.ENJOY_SSH_ASKPASS_FILE, "utf8")
    assert.equal(secret, "s3cret")
    if (process.platform !== "win32") {
      const printed = execFileSync(handle.env.SSH_ASKPASS, ["Password:"], {
        env: handle.env,
        encoding: "utf8"
      })
      assert.equal(printed, "s3cret")
      const yes = execFileSync(handle.env.SSH_ASKPASS, ["Are you sure you want to continue connecting (yes/no)?"], {
        env: handle.env,
        encoding: "utf8"
      })
      assert.match(yes, /yes/)
    }
    handle.cleanup()
    assert.throws(() => readFileSync(handle.env.ENJOY_SSH_ASKPASS_FILE))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test("空密码直接拒绝，不 spawn ssh", () => {
  assert.throws(() => prepareSshAskpass("  "), /请填写登录密码/)
})
