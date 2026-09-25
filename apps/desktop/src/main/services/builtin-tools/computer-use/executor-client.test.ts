import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { ExecutorFailure, startExecutor } from "./executor-client.ts"

function writeScript(name: string, source: string): string {
  const file = path.join(os.tmpdir(), name)
  fs.writeFileSync(file, source)
  return file
}

test("cancelInFlight 拒绝在途请求，不 dispose 整只 helper", async () => {
  const handle = startExecutor(process.execPath, ["-e", "process.stdin.resume()"], 5_000)
  try {
    const pending = handle.request("act", { action: "click" })
    await new Promise((resolve) => setTimeout(resolve, 30))
    handle.cancelInFlight()
    await assert.rejects(
      () => pending,
      (error: unknown) => error instanceof ExecutorFailure && error.code === "executor_cancelled"
    )
    handle.cancelInFlight()
  } finally {
    handle.dispose()
  }
})

test("超时以 executor_timeout 失败", async () => {
  const handle = startExecutor(process.execPath, ["-e", "process.stdin.resume()"], 200)
  try {
    await assert.rejects(
      () => handle.request("doctor", {}),
      (error: unknown) => error instanceof ExecutorFailure && error.code === "executor_timeout"
    )
  } finally {
    handle.dispose()
  }
})

test("崩溃重启一次，第二次崩溃不再拉起", async () => {
  const marker = path.join(os.tmpdir(), `cu-crash-${Date.now()}`)
  const script = writeScript(
    `cu-crash-${Date.now()}.mjs`,
    `import fs from "node:fs"
const marker = process.argv[2]
fs.appendFileSync(marker, "start\\n")
process.stdin.setEncoding("utf8")
let buffer = ""
process.stdin.on("data", (chunk) => {
  buffer += chunk
  if (!buffer.includes("\\n")) return
  process.exit(1)
})
`
  )
  const handle = startExecutor(process.execPath, [script, marker], 2000)
  try {
    await assert.rejects(
      () => handle.request("doctor", {}),
      (error: unknown) => error instanceof ExecutorFailure && error.code === "executor_exited"
    )
    await assert.rejects(
      () => handle.request("doctor", {}),
      (error: unknown) => error instanceof ExecutorFailure && error.code === "executor_exited"
    )
    await new Promise((resolve) => setTimeout(resolve, 80))
    const starts = fs.readFileSync(marker, "utf8").split("start").length - 1
    assert.equal(starts, 2)
  } finally {
    handle.dispose()
    fs.rmSync(script, { force: true })
    fs.rmSync(marker, { force: true })
  }
})

test("崩溃后的下一进程能回答请求", async () => {
  const marker = path.join(os.tmpdir(), `cu-once-${Date.now()}`)
  const script = writeScript(
    `cu-once-${Date.now()}.mjs`,
    `import fs from "node:fs"
const marker = process.argv[2]
const n = fs.existsSync(marker) ? Number(fs.readFileSync(marker, "utf8")) : 0
fs.writeFileSync(marker, String(n + 1))
process.stdin.setEncoding("utf8")
let buffer = ""
process.stdin.on("data", (chunk) => {
  buffer += chunk
  const lines = buffer.split("\\n")
  buffer = lines.pop() ?? ""
  for (const line of lines) {
    if (!line.trim()) continue
    if (n === 0) process.exit(1)
    const req = JSON.parse(line)
    process.stdout.write(JSON.stringify({ id: req.id, result: { recovered: true } }) + "\\n")
  }
})
`
  )
  const handle = startExecutor(process.execPath, [script, marker], 2000)
  try {
    await assert.rejects(() => handle.request("doctor", {}))
    const recovered = await handle.request("doctor", {})
    assert.equal((recovered as { recovered: boolean }).recovered, true)
  } finally {
    handle.dispose()
    fs.rmSync(script, { force: true })
    fs.rmSync(marker, { force: true })
  }
})
