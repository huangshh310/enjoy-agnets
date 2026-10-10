import assert from "node:assert/strict"
import { test } from "node:test"
import {
  credentialStatusLabelKey,
  credentialUiState,
  credentialUnverifiedHintKey,
  showReadyUnverifiedHint
} from "./credential-check-ui.ts"

test("三态：ok / invalid / unverified / pending", () => {
  assert.equal(credentialUiState({ state: "ok" }, { hasKey: true }), "ok")
  assert.equal(credentialUiState({ state: "invalid", code: "auth_rejected" }, { hasKey: true }), "invalid")
  assert.equal(
    credentialUiState({ state: "unverified", code: "network", checkedAt: "2026-10-10T00:00:00.000Z" }, { hasKey: true }),
    "unverified"
  )
  assert.equal(
    credentialUiState({ state: "unverified", code: "timeout" }, { hasKey: true }),
    "unverified"
  )
  assert.equal(credentialUiState({ state: "unverified" }, { hasKey: true }), "pending")
  assert.equal(credentialUiState({ state: "ok" }, { hasKey: true, pending: true }), "pending")
  assert.equal(credentialUiState(undefined, { hasKey: true }), "pending")
  assert.equal(credentialUiState(undefined), "none")
})

test("词条：绿已连上 / 红密钥无效 / 灰还没验证 / 正在验证", () => {
  assert.equal(credentialStatusLabelKey("ok"), "settings.setupGuide.connectApiKeyConnected")
  assert.equal(credentialStatusLabelKey("invalid"), "settings.setupGuide.credentialInvalid")
  assert.equal(credentialStatusLabelKey("unverified"), "settings.setupGuide.credentialUnverified")
  assert.equal(credentialStatusLabelKey("pending"), "settings.setupGuide.verifyPending")
})

test("还没验证次行按 code，不进 tooltip", () => {
  assert.equal(credentialUnverifiedHintKey("network"), "settings.setupGuide.credentialUnverifiedNetwork")
  assert.equal(credentialUnverifiedHintKey("timeout"), "settings.setupGuide.credentialUnverifiedTimeout")
  assert.equal(credentialUnverifiedHintKey("unknown"), "settings.setupGuide.credentialUnverifiedUnknown")
  assert.equal(credentialUnverifiedHintKey(undefined), "settings.setupGuide.credentialUnverifiedUnknown")
})

test("末屏副标题只看 ready && unverified，不重算 ready", () => {
  assert.equal(showReadyUnverifiedHint({ ready: true, credentialState: "unverified" }), true)
  assert.equal(showReadyUnverifiedHint({ ready: true, credentialState: "ok" }), false)
  assert.equal(showReadyUnverifiedHint({ ready: false, credentialState: "unverified" }), false)
  assert.equal(showReadyUnverifiedHint({ ready: true, credentialState: "invalid" }), false)
})
