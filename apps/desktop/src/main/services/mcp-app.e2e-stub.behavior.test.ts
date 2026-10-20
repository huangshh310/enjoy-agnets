/**
 * E2E stub 下「打开 App」只给 demo 页，不拉起真 Server 进程。
 * 回归：CI 上 agent-stub 先等 `npx -y @modelcontextprotocol/server-everything` 现下包 + initialize，
 * 慢时超过 15s，`mcp-app-frame` 一直不出。
 */
import assert from "node:assert/strict"
import { test } from "node:test"

const { openMcpApp, disconnectServer, upsertServer } = await import("./mcp-app.e2e-stub.behavior.load.ts")

test("stub 下打开 App 不等真 Server：不应答的 stdio Server 也立刻出 demo 页", async () => {
  const previousStub = process.env.ENJOY_E2E_STUB
  const previousUd = process.env.ENJOY_E2E_USERDATA
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = "/tmp/e2e-ud-mcp-app"
  // `node` 不带脚本会一直读 stdin、永不回 initialize：真连接就得等到 25s 超时。
  const server = upsertServer({
    name: "hang-server",
    transport: "stdio",
    command: "node",
    trusted: true,
    allowedResourceUris: [],
    modelVisibleTools: [],
    appOnlyTools: []
  })
  try {
    const started = Date.now()
    const opened = await Promise.race([
      openMcpApp(server.id),
      new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), 3_000).unref())
    ])
    assert.notEqual(opened, "timeout", "stub 打开 App 被真 Server 连接卡住")
    if (opened === "timeout") return
    assert.equal(opened.demo, true)
    assert.equal(opened.available, true)
    assert.ok(opened.srcDoc && opened.srcDoc.length > 0)
    assert.ok(Date.now() - started < 3_000)
  } finally {
    await disconnectServer(server.id).catch(() => undefined)
    if (previousStub === undefined) delete process.env.ENJOY_E2E_STUB
    else process.env.ENJOY_E2E_STUB = previousStub
    if (previousUd === undefined) delete process.env.ENJOY_E2E_USERDATA
    else process.env.ENJOY_E2E_USERDATA = previousUd
  }
})
