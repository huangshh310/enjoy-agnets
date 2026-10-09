/**
 * 打包前编译 AppSnap helper。非 macOS 只留说明，不假装能截图。
 * 签名规则与 computer-use 相同：没有身份就不报就绪。
 */
const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const { signDarwinHelper } = require("./codesign-helper.cjs")

const root = path.join(__dirname, "..", "native", "appsnap")
const platform = process.env.CU_PLATFORM || process.platform
const arch = process.env.CU_ARCH || process.arch
const dest = path.join(root, "pack", `${platform}-${arch}`)

fs.mkdirSync(dest, { recursive: true })

if (platform !== "darwin") {
  fs.writeFileSync(path.join(dest, "UNAVAILABLE.txt"), "AppSnap capture is macOS-only.\n")
  console.log(`staged appsnap unavailable -> ${dest}`)
  process.exit(0)
}

const darwin = path.join(root, "darwin")
const sources = fs.readdirSync(darwin).filter((name) => name.endsWith(".swift")).sort().map((name) => path.join(darwin, name))
const out = path.join(dest, "appsnap")
const result = spawnSync("swiftc", ["-O", "-o", out, ...sources], { stdio: "inherit" })
if (result.status !== 0) process.exit(result.status || 1)
const sidecar = signDarwinHelper(out, process.env, undefined, {
  identifier: "com.enjoyagents.appsnap",
  sidecarName: "appsnap.identity.json"
})
if (!sidecar.signed) {
  console.warn(`appsnap helper unsigned (${sidecar.reason || "no_identity_env"}); capture will not report ready`)
}
console.log(`staged appsnap -> ${dest}`)
