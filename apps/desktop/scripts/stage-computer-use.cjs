/**
 * 打包前把当前平台的 Computer Use 执行器放到 native/computer-use/pack/<platform>-<arch>/。
 * darwin 编译后走 codesign-helper：有团队身份才签名；未签名 sidecar 不得被医生当成就绪。
 */
const { spawnSync } = require("node:child_process")
const fs = require("node:fs")
const path = require("node:path")
const { signDarwinHelper } = require("./codesign-helper.cjs")

const root = path.join(__dirname, "..", "native", "computer-use")
const platform = process.env.CU_PLATFORM || process.platform
const arch = process.env.CU_ARCH || process.arch
const dest = path.join(root, "pack", `${platform}-${arch}`)

fs.mkdirSync(dest, { recursive: true })

if (platform === "darwin") {
  const darwin = path.join(root, "darwin")
  const sources = fs.readdirSync(darwin).filter((name) => name.endsWith(".swift")).sort().map((name) => path.join(darwin, name))
  const out = path.join(dest, "computer-use")
  const result = spawnSync("swiftc", ["-O", "-o", out, ...sources], { stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status || 1)
  const sidecar = signDarwinHelper(out)
  if (!sidecar.signed) {
    console.warn(`computer-use helper unsigned (${sidecar.reason || "no_identity_env"}); desktop_doctor will not be green`)
  }
} else if (platform === "win32") {
  fs.copyFileSync(path.join(root, "win32", "executor.ps1"), path.join(dest, "computer-use.ps1"))
} else {
  fs.copyFileSync(path.join(root, "linux", "executor.py"), path.join(dest, "computer-use.py"))
}

console.log(`staged computer-use -> ${dest}`)
