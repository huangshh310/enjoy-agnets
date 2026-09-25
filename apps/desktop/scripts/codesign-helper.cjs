/**
 * 打包 darwin Computer Use helper：有身份就 codesign，并写 sidecar。
 * 没有 CSC_NAME / CU_CODESIGN_IDENTITY 时不假装已签名。
 */
const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")

const IDENTITY_ENV = ["CU_CODESIGN_IDENTITY", "CSC_NAME", "APPLE_CODESIGN_IDENTITY"]
const HELPER_IDENTIFIER = "com.enjoyagents.computer-use"

function resolveCodesignIdentity(env = process.env) {
  for (const key of IDENTITY_ENV) {
    const value = typeof env[key] === "string" ? env[key].trim() : ""
    if (value) return { identity: value, source: key }
  }
  return null
}

function shouldNotarizeStyle(identity, env = process.env) {
  if (env.CU_CODESIGN_NOTARIZE === "1") return true
  if (env.CU_CODESIGN_NOTARIZE === "0") return false
  return /developer id/i.test(identity)
}

function buildCodesignArgs(identity, binary, env = process.env) {
  const args = ["--force", "--sign", identity, "--identifier", HELPER_IDENTIFIER]
  if (shouldNotarizeStyle(identity, env)) args.push("--timestamp", "--options", "runtime")
  args.push(binary)
  return args
}

function sidecarPath(binary) {
  return path.join(path.dirname(binary), "computer-use.identity.json")
}

function writeSidecar(binary, sidecar) {
  fs.writeFileSync(sidecarPath(binary), `${JSON.stringify(sidecar, null, 2)}\n`)
}

function unsignedSidecar(source, reason) {
  return { signed: false, identity: null, source: source ?? null, reason }
}

/** 身份缺失：写未签名 sidecar，不抛。身份在但 codesign 失败：抛错，禁止静默当成功。 */
function signDarwinHelper(binary, env = process.env, run = runCodesign) {
  const resolved = resolveCodesignIdentity(env)
  if (!resolved) {
    const sidecar = unsignedSidecar(null, "no_identity_env")
    writeSidecar(binary, sidecar)
    return sidecar
  }
  const args = buildCodesignArgs(resolved.identity, binary, env)
  const result = run(args)
  if (result.status !== 0) {
    const reason = String(result.stderr || result.stdout || "codesign_failed").trim()
    writeSidecar(binary, unsignedSidecar(resolved.source, reason))
    const error = new Error(`codesign helper failed: ${reason}`)
    error.code = "codesign_failed"
    throw error
  }
  const sidecar = { signed: true, identity: resolved.identity, source: resolved.source, reason: null }
  writeSidecar(binary, sidecar)
  return sidecar
}

function runCodesign(args) {
  return spawnSync("codesign", args, { encoding: "utf8" })
}

module.exports = {
  IDENTITY_ENV,
  HELPER_IDENTIFIER,
  resolveCodesignIdentity,
  shouldNotarizeStyle,
  buildCodesignArgs,
  sidecarPath,
  signDarwinHelper
}
