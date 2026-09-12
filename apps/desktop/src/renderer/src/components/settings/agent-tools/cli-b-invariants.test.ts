/**
 * CLI-B 视觉锁：Pi / Hermes / 自定义 安装与未就绪诚实。真源 cli-b-registry-install.html。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const preview = join(dir, "../../../../../../../../design/previews/cli-b-registry-install.html")

const files = {
  missing: readFileSync(join(dir, "acp-registry-missing.tsx"), "utf8"),
  detail: readFileSync(join(dir, "acp-registry-detail.tsx"), "utf8"),
  model: readFileSync(join(dir, "acp-registry-model.ts"), "utf8"),
  assistant: readFileSync(join(dir, "agent-tool-row-assistant.tsx"), "utf8"),
  actions: readFileSync(join(dir, "agent-tool-row-actions.tsx"), "utf8"),
  row: readFileSync(join(dir, "agent-tool-row.tsx"), "utf8"),
  zh: readFileSync(join(dir, "../../../i18n/catalogs/zh/settings.ts"), "utf8"),
  en: readFileSync(join(dir, "../../../i18n/catalogs/en/settings.ts"), "utf8")
}

test("视觉真源锁 CLI-B 六态与密表三列", () => {
  const html = readFileSync(preview, "utf8")
  assert.ok(html.includes("【视觉真源】CLI-B"))
  assert.ok(html.includes("还没装好这个助手"))
  assert.ok(html.includes("官方登录 · 检测中"))
  assert.ok(html.includes("grid-cols-[1.2fr_1.4fr_8.75rem]"))
  assert.ok(html.includes("不假一键"))
  assert.ok(!html.includes("progressbar"))
})

test("Registry 未找到卡写还没装好，复制-only 不假一键", () => {
  assert.ok(files.missing.includes("notReadyTitle"))
  assert.ok(files.missing.includes("notReadyHint"))
  assert.ok(files.missing.includes("registryInstallAction"))
  assert.ok(files.detail.includes("isRegistryNotReady"))
  assert.ok(files.model.includes('return "copy"'))
  assert.ok(!files.missing.includes("progressbar"))
  assert.ok(!files.missing.includes("BYOK"))
  assert.ok(!files.missing.includes("vault"))
})

test("密表检测中 ≠ 就绪；自定义动力源空列", () => {
  assert.ok(files.assistant.includes("inspectingStatus"))
  assert.ok(files.actions.includes("inspectingStatus"))
  assert.ok(files.row.includes('parts.kind === "none"'))
  assert.ok(files.row.includes("engineReadiness"))
  assert.ok(!files.assistant.includes("role=\"progressbar\""))
})

test("Pi / Hermes C 端摘要不含协议行话", () => {
  for (const src of [files.zh, files.en]) {
    assert.ok(src.includes("notReadyTitle"))
    assert.ok(src.includes("inspectingStatus"))
    const pi = src.match(/pi:\s*"([^"]+)"/)?.[1] ?? ""
    const hermes = src.match(/hermes:\s*"([^"]+)"/)?.[1] ?? ""
    assert.ok(pi)
    assert.ok(hermes)
    assert.doesNotMatch(pi, /ACP|RPC|stdio|spawn/i)
    assert.doesNotMatch(hermes, /ACP|RPC|stdio|spawn/i)
  }
})
