import assert from "node:assert/strict"
import { test } from "node:test"
import type { Automation } from "@enjoy-agents/ipc-contract"
import {
  isLoopbackHost,
  matchWebhookRoutes,
  normalizeWebhookPath,
  webhookRoutesFrom
} from "./automations-webhook-match.ts"

const routes = [
  { id: "auto_1", path: "/hooks/enjoy", secret: "s3cret" },
  { id: "auto_open", path: "/hooks/open" }
]

function url(path: string): URL {
  return new URL(`http://127.0.0.1:8765${path}`)
}

test("路径缺省 /hooks/enjoy，去掉尾斜杠", () => {
  assert.equal(normalizeWebhookPath(undefined), "/hooks/enjoy")
  assert.equal(normalizeWebhookPath("hooks/enjoy/"), "/hooks/enjoy")
})

test("只认本机 Host，拒绝公网", () => {
  assert.equal(isLoopbackHost("127.0.0.1:8765"), true)
  assert.equal(isLoopbackHost("localhost"), true)
  assert.equal(isLoopbackHost("example.com"), false)
  assert.equal(isLoopbackHost("0.0.0.0:8765"), false)
})

test("约定 POST + token 才匹配", () => {
  const headers = { host: "127.0.0.1:8765", authorization: "Bearer s3cret" }
  const hit = matchWebhookRoutes("POST", url("/hooks/enjoy"), headers, routes)
  assert.equal(hit.status, 202)
  assert.deepEqual(hit.matched.map((item) => item.id), ["auto_1"])
  assert.equal(matchWebhookRoutes("GET", url("/hooks/enjoy"), headers, routes).status, 405)
  assert.equal(matchWebhookRoutes("POST", url("/hooks/enjoy"), { host: "127.0.0.1:8765" }, routes).status, 401)
  assert.equal(matchWebhookRoutes("POST", url("/nope"), headers, routes).status, 404)
})

test("无密钥路径只看 POST", () => {
  const hit = matchWebhookRoutes("POST", url("/hooks/open"), { host: "127.0.0.1:8765" }, routes)
  assert.equal(hit.status, 202)
  assert.deepEqual(hit.matched.map((item) => item.id), ["auto_open"])
})

test("只收集已启用 webhook 行", () => {
  const items = [
    {
      id: "a",
      name: "hook",
      prompt: "x",
      trigger: "webhook",
      webhookPort: 8765,
      enabled: true,
      updatedAt: 1
    },
    {
      id: "b",
      name: "关",
      prompt: "x",
      trigger: "webhook",
      webhookPort: 8765,
      enabled: false,
      updatedAt: 1
    },
    {
      id: "c",
      name: "保存后",
      prompt: "x",
      trigger: "on_save",
      enabled: true,
      updatedAt: 1
    },
    {
      id: "d",
      name: "并存",
      prompt: "x",
      trigger: "on_save",
      triggers: ["webhook"],
      webhookPort: 9000,
      enabled: true,
      updatedAt: 1
    }
  ] as Automation[]
  const grouped = webhookRoutesFrom(items)
  assert.equal(grouped.get(8765)?.length, 1)
  assert.equal(grouped.get(8765)?.[0]?.id, "a")
  assert.equal(grouped.get(9000)?.[0]?.id, "d")
})
