/**
 * 授权 URL 只认官方「Open this URL」标记行，避免提示里其它 https 抢先打开。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import {
  extractDeviceUserCode,
  extractLoginUrl,
  looksLikeEmptyOkPrompt,
  looksLikeInteractiveLogin,
  loginFinished
} from "./extract-login-url.ts"

test("抽出 omp 打印的授权 URL，丢掉 token 查询", () => {
  assert.equal(
    extractLoginUrl("Open this URL in your browser:\nhttps://auth.example.com/authorize?client_id=x\n"),
    "https://auth.example.com/authorize?client_id=x"
  )
  assert.equal(
    extractLoginUrl("https://evil.example/callback?access_token=SECRET"),
    null
  )
})

test("没有官方标记行时不抽裸 https，避免跳过 GitHub 空回车", () => {
  assert.equal(
    extractLoginUrl(
      "GitHub Enterprise URL/domain (blank for github.com):\nSee https://docs.github.com/enterprise\n"
    ),
    null
  )
  assert.equal(
    extractLoginUrl("Open this URL in your browser:\nhttps://github.com/login/device\n"),
    "https://github.com/login/device"
  )
})

test("识别需要粘贴的交互登录，不把设备码当成密钥提问", () => {
  assert.equal(looksLikeInteractiveLogin("Paste the authorization code"), true)
  assert.equal(looksLikeInteractiveLogin("Waiting for pasted authorization code"), true)
  assert.equal(looksLikeInteractiveLogin("Create or copy your Fireworks API key"), true)
  assert.equal(looksLikeInteractiveLogin("Enter code: AB12-CD34"), false)
  assert.equal(looksLikeInteractiveLogin("Open this URL"), false)
  assert.equal(loginFinished("Credentials saved to ~/.omp/agent/agent.db"), true)
})

test("GitHub Enterprise 空回车提示与设备码", () => {
  assert.equal(looksLikeEmptyOkPrompt("GitHub Enterprise URL/domain (blank for github.com):"), true)
  assert.equal(looksLikeEmptyOkPrompt("Paste the authorization code"), false)
  assert.equal(extractDeviceUserCode("Enter code: ab12-cd34\n"), "AB12-CD34")
})
