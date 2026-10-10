/**
 * 密钥写调用方：必须走 runSecretWrite / readSecretWrite，失败不摊英文、不关表单。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")

function src(rel: string): string {
  return readFileSync(join(root, rel), "utf8")
}

test("供应商 / 快捷 Key / SSH / Harness / 自定义工具都走 secret-write", () => {
  const writes = src("components/settings/providers/provider-editor-writes.ts")
  const quick = src("components/settings/agent-tools/agent-tool-quick-key-dialog.tsx")
  const ssh = src("components/settings/workspace/use-ssh-connections.ts")
  const harness = src("components/settings/settings-harness-credentials.tsx")
  const custom = src("components/settings/agent-tools/custom-acp-agent-submit.ts")
  const remote = src("components/workspace/create-project-dialog.tsx")
  assert.match(writes, /runSecretWrite/)
  assert.match(writes, /upsertProvider/)
  assert.match(quick, /runSecretWrite/)
  assert.match(quick, /upsertProvider/)
  assert.match(ssh, /runSecretWrite/)
  assert.match(ssh, /sshHosts\.upsert/)
  assert.match(harness, /runSecretWrite/)
  assert.match(harness, /setHarness/)
  assert.match(custom, /readSecretWrite/)
  assert.match(custom, /upsertCustom/)
  assert.match(remote, /runSecretWrite/)
  assert.match(remote, /openSsh/)
})

test("设默认模型 / persistRuntime 认 union，不把 {ok:false} 当快照", () => {
  const apply = src("lib/apply-active-model-write.ts")
  const persist = src("hooks/persist-runtime.ts")
  const defaults = src("components/settings/settings-defaults.tsx")
  const caps = src("components/settings/settings-capabilities.tsx")
  assert.match(apply, /runSecretWrite/)
  assert.match(apply, /SettingsSnapshot\.safeParse/)
  assert.match(persist, /requireSecretWrite|runSecretWrite/)
  assert.match(persist, /SecretWriteUiError/)
  assert.match(defaults, /applyActiveModelWrite/)
  assert.match(defaults, /SecretWriteError/)
  assert.match(caps, /applyActiveModelWrite/)
  assert.match(caps, /SecretWriteError/)
})

test("失败不关抽屉、不吞掉、不把钥匙串英文写进 setError", () => {
  const hook = src("components/settings/providers/use-provider-settings.ts")
  const drawer = src("components/settings/providers/provider-editor-drawer.tsx")
  const chrome = src("components/settings/providers/provider-editor-drawer-chrome.tsx")
  const ssh = src("components/settings/workspace/use-ssh-connections.ts")
  const harness = src("components/settings/settings-harness-credentials.tsx")
  const quick = src("components/settings/agent-tools/agent-tool-quick-key-dialog.tsx")
  assert.match(hook, /setSaveError\(outcome\.code\)/)
  assert.match(hook, /return false/)
  assert.match(drawer, /SecretWritePreflight/)
  assert.match(chrome, /SecretWriteError/)
  assert.match(chrome, /SecretWriteSaveTip/)
  assert.match(ssh, /gate\.setWriteCode\(outcome\.code\)/)
  const upsertBlock = ssh.slice(ssh.indexOf("addHost:"), ssh.indexOf("removeHost:"))
  assert.doesNotMatch(upsertBlock, /setError\(err instanceof Error \? err\.message/)
  assert.match(harness, /gate\.setWriteCode\(outcome\.code\)/)
  assert.match(quick, /setWriteCode\(outcome\.code\)/)
  assert.match(quick, /SecretWritePreflight/)
})
