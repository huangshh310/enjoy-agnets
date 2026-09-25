import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { createDesktopSession } from "./desktop-session.ts"
import { doctorReport, formatDoctorLine } from "./doctor-report.ts"
import type { ExecutorHandle } from "./executor-client.ts"
import type { CodesignInfo } from "./executor-identity.ts"

const TEAM = "Developer ID Application: Enjoy Agents (TEAM1)"

test("未签名 helper：即使宿主 AX 与 RPC trusted 也不得绿", async () => {
  const helper = touch("cu-doctor-unsigned")
  const report = await doctorReport(
    fakeHandle(helper, { trusted: true, backgroundClick: true }),
    { accessibility: true, screenCapture: true },
    darwinHooks(helper, unsigned(helper))
  )
  assert.equal(report.success, false)
  assert.equal(report.code, "executor_unsigned")
  assert.equal(report.backgroundClick, false)
  assert.match(formatDoctorLine(report), /没有有效签名|重装签名/)
})

test("路径或签名错位：医生不绿", async () => {
  const spawn = touch("cu-doctor-spawn")
  const live = touch("cu-doctor-live")
  const report = await doctorReport(
    fakeHandle(live, { trusted: true }),
    { accessibility: true, screenCapture: true },
    darwinHooks(spawn, signed(spawn))
  )
  assert.equal(report.success, false)
  assert.equal(report.code, "executor_identity_mismatch")
  assert.notEqual(formatDoctorLine(report), "后台点击可用。")
})

test("sidecar 身份与现场签名不一致：不绿", async () => {
  const helper = touch("cu-doctor-sidecar")
  fs.writeFileSync(
    path.join(path.dirname(helper), "computer-use.identity.json"),
    JSON.stringify({ signed: true, identity: "Developer ID Application: Other (ZZZZ)" })
  )
  const report = await doctorReport(
    fakeHandle(helper, { trusted: true, executablePath: helper }),
    { accessibility: true, screenCapture: true },
    darwinHooks(helper, signed(helper))
  )
  assert.equal(report.success, false)
  assert.equal(report.code, "executor_identity_mismatch")
})

test("签名且路径一致、helper AX 通过：可以绿", async () => {
  const helper = touch("cu-doctor-green")
  const report = await doctorReport(
    fakeHandle(helper, { trusted: true, backgroundClick: true, executablePath: helper }),
    { accessibility: true, screenCapture: true },
    darwinHooks(helper, signed(helper), "TEAM1")
  )
  assert.equal(report.success, true)
  assert.equal(report.helperSigned, true)
  assert.equal(report.helperMatchesSpawn, true)
  assert.equal(report.accessibility, true)
  assert.equal(formatDoctorLine(report), "后台点击可用。")
})

test("签名匹配但 helper 自己没有 AX：不绿，人话指向 helper", async () => {
  const helper = touch("cu-doctor-ax")
  const report = await doctorReport(
    fakeHandle(helper, { trusted: false, backgroundClick: false, executablePath: helper }),
    { accessibility: true, screenCapture: true },
    darwinHooks(helper, signed(helper))
  )
  assert.equal(report.success, false)
  assert.equal(report.code, "permission_denied")
  assert.match(formatDoctorLine(report), /Enjoy Computer Use helper/)
})

test("会话 doctor 走同一套身份钩子", async () => {
  const helper = touch("cu-session-unsigned")
  const session = createDesktopSession(
    () => fakeHandle(helper, { trusted: true, backgroundClick: true }),
    {
      permissions: () => ({ accessibility: true, screenCapture: true }),
      ...darwinHooks(helper, unsigned(helper))
    }
  )
  const report = await session.doctor()
  assert.equal(report.success, false)
  assert.equal(report.code, "executor_unsigned")
})

function darwinHooks(helper: string, info: CodesignInfo, expectedIdentity?: string) {
  return {
    identityPlatform: "darwin" as const,
    expectedIdentity: expectedIdentity ?? null,
    resolveCommand: () => ({ command: helper, args: [] }),
    inspectCodesign: (filePath: string) => (filePath === helper ? info : unsigned(filePath))
  }
}

function fakeHandle(command: string, result: Record<string, unknown>): ExecutorHandle {
  return {
    command,
    args: [],
    request: async () => result,
    dispose() {}
  }
}

function signed(filePath: string): CodesignInfo {
  return { path: filePath, exists: true, signed: true, adhoc: false, identity: TEAM, teamId: "TEAM1" }
}

function unsigned(filePath: string): CodesignInfo {
  return { path: filePath, exists: true, signed: false, adhoc: false, identity: null, teamId: null }
}

function touch(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`))
  const file = path.join(dir, "computer-use")
  fs.writeFileSync(file, "helper")
  return file
}
