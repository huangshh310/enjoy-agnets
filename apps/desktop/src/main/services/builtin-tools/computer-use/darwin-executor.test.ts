import assert from "node:assert/strict"
import test from "node:test"
import { startExecutor } from "./executor-client.ts"
import { resolveExecutorCommand } from "./executor-command.ts"

const onMac = process.platform === "darwin"
const gui = onMac && Boolean(process.env.ENJOY_CU_GUI)

test("macOS 执行器 doctor 能回答", { skip: !onMac }, async () => {
  const command = resolveExecutorCommand("darwin", "/no-bundle", process.arch)
  assert.ok(command)
  const handle = startExecutor(command.command, command.args, 20_000)
  try {
    const doctor = (await handle.request("doctor", {})) as { trusted?: boolean; backgroundClick?: boolean }
    assert.equal(typeof doctor.trusted, "boolean")
    assert.equal(typeof doctor.backgroundClick, "boolean")
  } finally {
    handle.dispose()
  }
})

test("macOS GUI 拍树：未设 ENJOY_CU_GUI 时跳过，不记通过", { skip: !gui }, async () => {
  const command = resolveExecutorCommand("darwin", "/no-bundle", process.arch)
  assert.ok(command)
  const handle = startExecutor(command.command, command.args, 20_000)
  try {
    const listed = (await handle.request("list_apps", {})) as { apps?: Array<{ pid: number }> }
    assert.ok(Array.isArray(listed.apps))
    const pid = listed.apps?.[0]?.pid
    const snap = (await handle.request("snapshot", pid ? { pid } : {})) as { observation?: { elements?: unknown[] } }
    assert.ok(Array.isArray(snap.observation?.elements))
  } finally {
    handle.dispose()
  }
})
