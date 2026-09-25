import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  evaluateHelperIdentity,
  identityMatches,
  parseCodesignDump,
  type CodesignInfo
} from "./executor-identity.ts"

const TEAM = "Developer ID Application: Enjoy Agents (TEAM1)"

test("codesign 未签名 / ad-hoc 都不是可发布身份", () => {
  assert.equal(parseCodesignDump("code object is not signed at all").signed, false)
  assert.deepEqual(parseCodesignDump("Signature=adhoc\nTeamIdentifier=not set"), {
    signed: false,
    adhoc: true,
    identity: null,
    teamId: null
  })
  const signed = parseCodesignDump(`Authority=${TEAM}\nAuthority=Apple Root CA\nTeamIdentifier=TEAM1`)
  assert.equal(signed.signed, true)
  assert.equal(signed.identity, TEAM)
  assert.equal(signed.teamId, "TEAM1")
})

test("期望身份可对 Authority 或 Team ID", () => {
  const info = { identity: TEAM, teamId: "TEAM1" }
  assert.equal(identityMatches("TEAM1", info), true)
  assert.equal(identityMatches("Enjoy Agents", info), true)
  assert.equal(identityMatches("Other Team (ZZZZ)", info), false)
})

test("darwin 未签名或路径错位都不能 ready", () => {
  const helper = touch("cu-unsigned-helper")
  const other = touch("cu-other-helper")
  const unsigned = stamp(helper, { signed: false })
  const signed = stamp(helper, { signed: true, identity: TEAM, teamId: "TEAM1" })
  assert.equal(evaluateHelperIdentity({ platform: "darwin", spawnPath: helper, codesign: unsigned }).ready, false)
  assert.equal(evaluateHelperIdentity({ platform: "darwin", spawnPath: helper, codesign: unsigned }).code, "executor_unsigned")
  assert.equal(
    evaluateHelperIdentity({ platform: "darwin", spawnPath: helper, livePath: other, codesign: signed }).code,
    "executor_identity_mismatch"
  )
  assert.equal(
    evaluateHelperIdentity({
      platform: "darwin",
      spawnPath: helper,
      codesign: signed,
      expectedIdentity: "Other Team (ZZZZ)"
    }).code,
    "executor_identity_mismatch"
  )
})

test("darwin 签名且路径一致可以 ready；Win/Linux 不做签名门", () => {
  const helper = touch("cu-signed-helper")
  const signed = stamp(helper, { signed: true, identity: TEAM, teamId: "TEAM1" })
  const ok = evaluateHelperIdentity({
    platform: "darwin",
    spawnPath: helper,
    livePath: helper,
    codesign: signed,
    expectedIdentity: "TEAM1"
  })
  assert.equal(ok.ready, true)
  assert.equal(ok.helperSigned, true)
  assert.equal(evaluateHelperIdentity({ platform: "linux", spawnPath: "/usr/bin/python3" }).ready, true)
})

function stamp(filePath: string, extra: Partial<CodesignInfo>): CodesignInfo {
  return {
    path: filePath,
    exists: true,
    signed: false,
    adhoc: false,
    identity: null,
    teamId: null,
    ...extra
  }
}

function touch(name: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`))
  const file = path.join(dir, "computer-use")
  fs.writeFileSync(file, "helper")
  return file
}
