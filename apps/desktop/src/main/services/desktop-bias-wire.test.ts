/**
 * CU-P1-B kai 挂点：desktopBias 进 agent.run / 开流；Explore 不因提及注册。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("agent.run 字段经泵进开流，不改审批闸", () => {
  const pump = readFileSync(new URL("./agent-pump.ts", import.meta.url), "utf8")
  assert.match(pump, /desktopBias: run\.input\.desktopBias/)
  const local = readFileSync(new URL("./open-coding-stream-local.ts", import.meta.url), "utf8")
  assert.match(local, /desktopBias: input\.desktopBias/)
  assert.match(local, /createBuiltinAgentTools\(input\.mode\)/)
  assert.doesNotMatch(local, /createBuiltinAgentTools\(input\.mode,\s*input\.desktopBias\)/)
})

test("Explore 注册门不看 mention / desktopBias", () => {
  const tools = readFileSync(new URL("./builtin-tools/builtin-agent-tools.ts", import.meta.url), "utf8")
  assert.match(tools, /shouldRegisterDesktopControlTools\(mode, state\.computerUse\.enabled\)/)
  assert.doesNotMatch(tools, /desktopBias/)
  const gate = readFileSync(new URL("./builtin-tools/desktop-tool-gate.ts", import.meta.url), "utf8")
  assert.doesNotMatch(gate, /desktopBias/)
})

test("list IPC 失败回空名单，不造假应用", () => {
  const src = readFileSync(
    new URL("./builtin-tools/computer-use/desktop-tools.ts", import.meta.url),
    "utf8"
  )
  assert.match(src, /listDesktopMentionAppsIpc/)
  assert.match(src, /success: false, code: "executor_missing"/)
  assert.doesNotMatch(src, /NotInstalled/)
})

test("Composer 发送带上 desktopBias", () => {
  const send = readFileSync(
    new URL("../../renderer/src/hooks/runtime-interact/send-composer-run.ts", import.meta.url),
    "utf8"
  )
  assert.match(send, /desktopBiasForRun/)
  assert.match(send, /desktopBias \? \{ desktopBias \}/)
})
