import assert from "node:assert/strict"
import { createServer } from "node:http"
import { test } from "node:test"
import type { Automation } from "@enjoy-agents/ipc-contract"
import {
  listeningWebhookPorts,
  resetWebhookLauncher,
  setWebhookLauncher,
  stopWebhookListeners,
  syncWebhookListeners,
  webhookListenHost
} from "./automations-webhook.ts"

function webhookItem(port: number, id = "auto_hook"): Automation {
  return {
    id,
    name: "本地 hook 开一轮",
    prompt: "复盘",
    trigger: "webhook",
    webhookPort: port,
    webhookPath: "/hooks/enjoy",
    webhookSecret: "s3cret",
    enabled: true,
    updatedAt: 1
  }
}

async function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer()
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (!address || typeof address === "string") {
        server.close()
        reject(new Error("no port"))
        return
      }
      const port = address.port
      server.close((error) => (error ? reject(error) : resolve(port)))
    })
  })
}

test("只监听 127.0.0.1，约定 POST 开一轮，停听后不再收", async () => {
  const port = await freePort()
  const fired: string[] = []
  setWebhookLauncher(async (item) => {
    fired.push(item.id)
  })
  try {
    await syncWebhookListeners([webhookItem(port)])
    assert.deepEqual(listeningWebhookPorts(), [port])
    assert.equal(webhookListenHost(), "127.0.0.1")

    const ok = await fetch(`http://127.0.0.1:${port}/hooks/enjoy`, {
      method: "POST",
      headers: { Authorization: "Bearer s3cret" }
    })
    assert.equal(ok.status, 202)
    assert.deepEqual(fired, ["auto_hook"])

    const denied = await fetch(`http://127.0.0.1:${port}/hooks/enjoy`, { method: "POST" })
    assert.equal(denied.status, 401)

    await stopWebhookListeners()
    await assert.rejects(
      fetch(`http://127.0.0.1:${port}/hooks/enjoy`, {
        method: "POST",
        headers: { Authorization: "Bearer s3cret" }
      })
    )
    assert.deepEqual(listeningWebhookPorts(), [])
  } finally {
    await stopWebhookListeners()
    resetWebhookLauncher()
  }
})
