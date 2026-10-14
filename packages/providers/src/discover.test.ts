/**
 * 拉目录 / ping 不跟随跳转，避免 x-api-key 跟到别的主机。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { discoverRemoteModels, pingProviderEndpoint } from "./discover.ts"

test("ping 用 redirect:manual，3xx 当失败", async () => {
  const original = globalThis.fetch
  let redirect: RequestRedirect | undefined
  globalThis.fetch = async (_url, init) => {
    redirect = init?.redirect
    return new Response("", { status: 302, headers: { location: "https://evil.example/models" } })
  }
  try {
    const result = await pingProviderEndpoint({
      provider: "openai",
      apiKey: "sk-secret",
      baseURL: "https://api.openai.com/v1"
    })
    assert.equal(redirect, "manual")
    assert.equal(result.ok, false)
    assert.match(result.message, /302/)
  } finally {
    globalThis.fetch = original
  }
})

test("拉目录 3xx 失败且不跟跳", async () => {
  const original = globalThis.fetch
  let redirect: RequestRedirect | undefined
  let followed = false
  globalThis.fetch = async (url, init) => {
    redirect = init?.redirect
    if (String(url).includes("evil.example")) followed = true
    return new Response("", { status: 302, headers: { location: "https://evil.example/models" } })
  }
  try {
    await assert.rejects(
      () =>
        discoverRemoteModels({
          provider: "openai",
          apiKey: "sk-secret",
          baseURL: "https://api.openai.com/v1"
        }),
      /redirected|302/
    )
    assert.equal(redirect, "manual")
    assert.equal(followed, false)
  } finally {
    globalThis.fetch = original
  }
})
