import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import path from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

const script = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../../native/computer-use/linux/executor.py"
)

function ask(env: NodeJS.ProcessEnv, method: string, params: Record<string, unknown> = {}) {
  return new Promise<Record<string, unknown>>((resolve, reject) => {
    const child = spawn("python3", [script], { env: { ...process.env, ...env }, stdio: ["pipe", "pipe", "pipe"] })
    let out = ""
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error("python executor timeout"))
    }, 2000)
    child.stdout.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      out += chunk
      if (!out.includes("\n")) return
      clearTimeout(timer)
      child.kill()
      resolve(JSON.parse(out.split("\n")[0]) as Record<string, unknown>)
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.stdin.write(`${JSON.stringify({ id: "1", method, params })}\n`)
  })
}

test("没有 DISPLAY 时 doctor 是 no_display", async () => {
  const reply = await ask({ DISPLAY: "", WAYLAND_DISPLAY: "" }, "doctor")
  const error = reply.error as { code?: string }
  assert.equal(error?.code, "no_display")
})

test("Wayland 未允许前台时 act 是 needs_foreground，不依赖 pyatspi", async () => {
  const reply = await ask({ WAYLAND_DISPLAY: "wayland-0", DISPLAY: ":0" }, "act", { action: "click", elementId: "0.1" })
  const error = reply.error as { code?: string }
  assert.equal(error?.code, "needs_foreground")
})
