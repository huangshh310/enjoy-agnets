import assert from "node:assert/strict"
import { test } from "node:test"
import { decodeLaunchArgs, encodeLaunchArgs, sanitizeCustomArgs } from "./args.ts"

test("认识的旗标变成开关，其余留自定义", () => {
  const decoded = decodeLaunchArgs("codex", ["--fast", "--search", "--foo"])
  assert.deepEqual(decoded.values, { fast: true, "web-search": true })
  assert.deepEqual(decoded.custom, ["--foo"])
})

test("Grok 联网是默认开，出现 disable 才关", () => {
  assert.equal(decodeLaunchArgs("grok", []).values["web-search"], true)
  assert.equal(decodeLaunchArgs("grok", ["--disable-web-search"]).values["web-search"], false)
})

test("开关写回 extraArgs，不丢自定义", () => {
  assert.deepEqual(encodeLaunchArgs("codex", { fast: true, "web-search": false }, ["--foo"]), [
    "--fast",
    "--foo"
  ])
  assert.deepEqual(encodeLaunchArgs("grok", { fast: false, "web-search": false }, []), [
    "--disable-web-search"
  ])
})

test("自定义只收以 - 开头的参数，避免用户当聊天框用", () => {
  assert.deepEqual(sanitizeCustomArgs("please --fast hello --bar"), ["--fast", "--bar"])
})
