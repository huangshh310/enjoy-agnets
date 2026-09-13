import assert from "node:assert/strict"
import { test } from "node:test"
import { probeUrlReachable } from "./use-preview-url-reachable.ts"

test("未启动的服务端口判定为不可达，不抛异常", async () => {
  // 一个通常没有服务监听的端口
  const reachable = await probeUrlReachable("http://127.0.0.1:59123", 200)
  assert.equal(reachable, false)
})
