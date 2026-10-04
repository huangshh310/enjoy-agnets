/**
 * 命令输出：模型份 16_000，界面份 120_000。界面字段不写回模型对象。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { CLIP_COMMAND_CHARS, CLIP_COMMAND_UI_CHARS } from "./clip-tool-text.ts"
import {
  publishCommandDisplay,
  splitCommandSurfaces,
  withCommandDisplay
} from "./command-display.ts"

test("超过模型上限且不到界面上限时，模型有省略标记，界面保留中间原文", () => {
  const marker = "UNIQUE_MIDDLE_TOKEN"
  const stdout = `${"a".repeat(20_000)}${marker}${"b".repeat(20_000)}`
  assert.ok(stdout.length > CLIP_COMMAND_CHARS)
  assert.ok(stdout.length < CLIP_COMMAND_UI_CHARS)
  const surfaces = splitCommandSurfaces(stdout, "")
  assert.match(surfaces.modelStdout, /omitted/)
  assert.equal(surfaces.modelStdout.includes(marker), false)
  assert.equal(surfaces.display.stdout.includes(marker), true)
  assert.equal(surfaces.display.stdout, stdout)

  const modelResult = {
    stdout: surfaces.modelStdout,
    stderr: surfaces.modelStderr,
    exitCode: 0
  }
  publishCommandDisplay("tool_mid", surfaces.display)
  const shown = withCommandDisplay(modelResult, "tool_mid") as {
    stdout: string
    displayStdout: string
  }
  assert.equal(shown.displayStdout.includes(marker), true)
  assert.equal("displayStdout" in modelResult, false)
  assert.equal(modelResult.stdout.includes(marker), false)
})

test("超过界面上限时省略数字等于被省掉的字符数", () => {
  const stdout = "x".repeat(CLIP_COMMAND_UI_CHARS + 10_000)
  const surfaces = splitCommandSurfaces(stdout, "")
  const omitted = stdout.length - CLIP_COMMAND_UI_CHARS
  assert.match(surfaces.display.stdout, new RegExp(`omitted ${omitted} chars`))
  assert.match(surfaces.modelStdout, /omitted/)
})
