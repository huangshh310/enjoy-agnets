/**
 * 关掉 stderr 读端后再猛写：没有守卫时 EPIPE 是未捕获异常（会弹出主进程对话框）。
 * 装上守卫后同样的写只被吞掉。
 */
import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const childFlag = process.env.ENJOY_STDIO_EPIPE_CHILD

if (childFlag === "1") {
  void runChild()
} else {
  test("关掉 stderr 读端后，EPIPE 只在没装守卫时变成未捕获异常", async () => {
    const bare = await countUncaught(false)
    const guarded = await countUncaught(true)
    assert.ok(bare > 0, "没有守卫时必须出现未捕获 EPIPE")
    assert.equal(guarded, 0)
  })
}

async function runChild(): Promise<void> {
  if (process.env.ENJOY_STDIO_EPIPE_GUARD === "1") {
    const { installStdioEpipeGuard } = await import("./stdio-epipe-guard.ts")
    installStdioEpipeGuard()
  }
  const out = process.env.ENJOY_STDIO_EPIPE_OUT
  const ready = process.env.ENJOY_STDIO_EPIPE_READY
  if (!out || !ready) throw new Error("missing epipe paths")
  let count = 0
  process.on("uncaughtException", (error: NodeJS.ErrnoException) => {
    if (error.code === "EPIPE") count += 1
  })
  fs.writeFileSync(ready, "1")
  const chunk = "x".repeat(64 * 1024)
  const timer = setInterval(() => {
    console.error(chunk)
  }, 5)
  setTimeout(() => {
    clearInterval(timer)
    setTimeout(() => {
      fs.writeFileSync(out, String(count))
      process.exit(0)
    }, 200)
  }, 500)
}

function countUncaught(guard: boolean): Promise<number> {
  const id = `${process.pid}-${guard ? "on" : "off"}`
  const out = path.join(os.tmpdir(), `enjoy-stdio-epipe-${id}.txt`)
  const ready = path.join(os.tmpdir(), `enjoy-stdio-epipe-${id}.ready`)
  fs.rmSync(out, { force: true })
  fs.rmSync(ready, { force: true })
  const child = spawn(
    process.execPath,
    ["--experimental-strip-types", fileURLToPath(import.meta.url)],
    {
      env: {
        ...process.env,
        ENJOY_STDIO_EPIPE_CHILD: "1",
        ENJOY_STDIO_EPIPE_GUARD: guard ? "1" : "0",
        ENJOY_STDIO_EPIPE_OUT: out,
        ENJOY_STDIO_EPIPE_READY: ready
      },
      stdio: ["ignore", "pipe", "pipe"]
    }
  )
  const closePipes = setInterval(() => {
    if (!fs.existsSync(ready)) return
    clearInterval(closePipes)
    child.stdout?.destroy()
    child.stderr?.destroy()
  }, 20)
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL")
      reject(new Error("epipe child timed out"))
    }, 4000)
    child.on("exit", () => {
      clearTimeout(timeout)
      clearInterval(closePipes)
      const text = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : ""
      fs.rmSync(out, { force: true })
      fs.rmSync(ready, { force: true })
      resolve(Number(text))
    })
  })
}
