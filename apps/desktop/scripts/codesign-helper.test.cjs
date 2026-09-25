const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const {
  buildCodesignArgs,
  resolveCodesignIdentity,
  sidecarPath,
  signDarwinHelper
} = require("./codesign-helper.cjs")

test("没有身份环境变量就不签名，并写下未签名 sidecar", () => {
  const binary = touch("cu-stage-unsigned")
  const sidecar = signDarwinHelper(binary, {}, () => {
    throw new Error("codesign should not run")
  })
  assert.equal(sidecar.signed, false)
  assert.equal(sidecar.reason, "no_identity_env")
  const saved = JSON.parse(fs.readFileSync(sidecarPath(binary), "utf8"))
  assert.equal(saved.signed, false)
})

test("CSC_NAME 在场时对真实 helper 路径调用 codesign --sign", () => {
  const binary = touch("cu-stage-signed")
  const env = { CSC_NAME: "Developer ID Application: Enjoy Agents (TEAM1)" }
  const resolved = resolveCodesignIdentity(env)
  assert.equal(resolved.source, "CSC_NAME")
  const args = buildCodesignArgs(resolved.identity, binary, env)
  assert.ok(args.includes("--sign"))
  assert.ok(args.includes(resolved.identity))
  assert.equal(args.at(-1), binary)
  const sidecar = signDarwinHelper(binary, env, (received) => {
    assert.deepEqual(received, args)
    return { status: 0, stdout: "", stderr: "" }
  })
  assert.equal(sidecar.signed, true)
  assert.equal(sidecar.identity, env.CSC_NAME)
})

test("有身份但 codesign 失败必须抛错，不得写成已签名", () => {
  const binary = touch("cu-stage-fail")
  assert.throws(
    () =>
      signDarwinHelper(binary, { CU_CODESIGN_IDENTITY: "Team A" }, () => ({
        status: 1,
        stdout: "",
        stderr: "errSecInternalComponent"
      })),
    /codesign helper failed/
  )
  const saved = JSON.parse(fs.readFileSync(sidecarPath(binary), "utf8"))
  assert.equal(saved.signed, false)
})

function touch(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`))
  const file = path.join(dir, "computer-use")
  fs.writeFileSync(file, "helper")
  return file
}
