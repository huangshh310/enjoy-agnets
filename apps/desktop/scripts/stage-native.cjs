/**
 * electron-builder beforePack：先放电脑操控执行器，再放 AppSnap。
 */
const { spawnSync } = require("node:child_process")
const path = require("node:path")

for (const script of ["stage-computer-use.cjs", "stage-appsnap.cjs"]) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status || 1)
}
