import assert from "node:assert/strict"
import { test } from "node:test"
import { mapListedDesktopApps } from "./map-listed-desktop-apps.ts"

test("bundleId 优先作稳 appKey，不把 pid 当键", () => {
  const mapped = mapListedDesktopApps({
    apps: [{ pid: 99, name: "计算器", bundleId: "com.apple.calculator" }]
  })
  assert.equal(mapped.ok, true)
  assert.deepEqual(mapped.apps, [
    {
      displayName: "计算器",
      appKey: "com.apple.calculator",
      appKeySource: "bundleId",
      stable: true,
      pid: 99
    }
  ])
})

test("只有 name 时回落规范化名，仍算稳键", () => {
  const mapped = mapListedDesktopApps({
    apps: [{ pid: 42, name: "Calculator.app" }]
  })
  assert.equal(mapped.apps[0]?.appKey, "calculator")
  assert.equal(mapped.apps[0]?.appKeySource, "appName")
  assert.equal(mapped.apps[0]?.stable, true)
})

test("仅 pid、无名字：可进候选，appKey 空，stable=false", () => {
  const mapped = mapListedDesktopApps({
    apps: [{ pid: 18422, name: "" }]
  })
  assert.equal(mapped.apps[0]?.displayName, "未识别窗口")
  assert.equal(mapped.apps[0]?.appKey, "")
  assert.equal(mapped.apps[0]?.stable, false)
  assert.equal(mapped.apps[0]?.pid, 18422)
})

test("数字 appKey / pid 字符串不得当稳键", () => {
  const mapped = mapListedDesktopApps({
    apps: [{ pid: 7, name: "", appKey: "18422" }]
  })
  assert.equal(mapped.apps[0]?.stable, false)
  assert.equal(mapped.apps[0]?.appKey, "")
})

test("执行器失败返回空列表，不造 NotInstalled", () => {
  const mapped = mapListedDesktopApps({ success: false, code: "executor_missing" })
  assert.equal(mapped.ok, false)
  assert.deepEqual(mapped.apps, [])
  assert.equal(mapped.code, "executor_missing")
})
