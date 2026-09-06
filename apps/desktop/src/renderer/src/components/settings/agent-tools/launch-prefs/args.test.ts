import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeLaunchArgs, encodeLaunchArgs, launchPrefsFor, sanitizeCustomArgs } from "./args.ts"

test("ACP 子命令暂无人话开关，避免再写出 --fast", () => {
  assert.deepEqual(launchPrefsFor("cursor"), [])
  assert.deepEqual(launchPrefsFor("grok"), [])
  const decoded = decodeLaunchArgs("cursor", ["--fast", "--foo"])
  assert.deepEqual(decoded.values, {})
  assert.deepEqual(decoded.custom, ["--fast", "--foo"])
})

test("没有开关时只回写自定义参数", () => {
  assert.deepEqual(encodeLaunchArgs("codex", { fast: true }, ["--foo"]), ["--foo"])
})

test("自定义只收以 - 开头的参数，避免用户当聊天框用", () => {
  assert.deepEqual(sanitizeCustomArgs("please --fast hello --bar"), ["--fast", "--bar"])
})
