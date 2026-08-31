import assert from "node:assert/strict"
import { test } from "node:test"
import { handshakeHttp, handshakeSse, parseSseData, rpcPost } from "./http-rpc.ts"

test("parseSseData 抽出 JSON-RPC result", () => {
  const messages = parseSseData('event: message\ndata: {"jsonrpc":"2.0","id":1,"result":{"ok":true}}\n\n')
  assert.equal(messages[0]?.result && typeof messages[0].result === "object", true)
})

test("handshakeHttp 接受 JSON initialize 结果", async () => {
  const result = await handshakeHttp("https://mcp.example/rpc", (async () =>
    new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: { protocolVersion: "2024-11-05" } }), {
      status: 200,
      headers: { "content-type": "application/json" }
    })) as typeof fetch)
  assert.equal(result.ok, true)
})

test("rpcPost 转发 tools/list 并记住 session", async () => {
  const result = await rpcPost(
    "https://mcp.example/rpc",
    { id: 2, method: "tools/list" },
    {
      fetchImpl: (async () =>
        new Response(JSON.stringify({ jsonrpc: "2.0", id: 2, result: { tools: [{ name: "ping" }] } }), {
          status: 200,
          headers: { "content-type": "application/json", "mcp-session-id": "sess_1" }
        })) as typeof fetch
    }
  )
  assert.equal(result.ok, true)
  assert.equal(result.sessionId, "sess_1")
  assert.deepEqual(result.result, { tools: [{ name: "ping" }] })
})

test("handshakeSse 在 POST 失败后尝试 GET", async () => {
  let calls = 0
  const result = await handshakeSse("https://mcp.example/sse", (async (_url, init) => {
    calls += 1
    if (init?.method === "POST") return new Response("no", { status: 405 })
    return new Response('data: {"jsonrpc":"2.0","id":1,"result":{}}\n\n', {
      status: 200,
      headers: { "content-type": "text/event-stream" }
    })
  }) as typeof fetch)
  assert.equal(result.ok, true)
  assert.equal(calls, 2)
})
