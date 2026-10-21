/**
 * mike P3（#163 巡检 25）：自定义端点没填模型时「保存并启用」灰着却不说缺什么——
 * 缺的那栏下面一行、页签小圆点、底栏一句「还差：…」。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { canSaveEditor, editorMissingFields, emptyEditor, missingFieldTab, proxyBlocksSave, simpleNameUpFront, type EditorState } from "./providers.types.ts"
import { missingSummaryText } from "./provider-missing-copy.ts"
import { zhSettings } from "../../../i18n/catalogs/zh/settings.ts"
import { enSettings } from "../../../i18n/catalogs/en/settings.ts"

function translator(catalog: Record<string, unknown>) {
  return (path: string, vars: Record<string, string | number> = {}) => {
    const raw = path
      .replace(/^settings\./, "")
      .split(".")
      .reduce<unknown>((node, key) => (node as Record<string, unknown> | undefined)?.[key], catalog)
    assert.equal(typeof raw, "string", `missing key ${path}`)
    return (raw as string).replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? `{${k}}`))
  }
}

function customEditor(patch: Partial<EditorState> = {}): EditorState {
  const editor = emptyEditor("custom")
  return {
    ...editor,
    name: "我的网关",
    endpoints: { openai: "https://llm-gw.example/v1" },
    keys: editor.keys.map((key) => ({ ...key, apiKey: "sk-test" })),
    modelId: "",
    ...patch
  }
}

test("form hint：自定义端点只差模型 → 只报 model，且和 canSaveEditor 一致（灰着）", () => {
  const editor = customEditor()
  assert.deepEqual(editorMissingFields(editor, true), ["model"])
  assert.equal(canSaveEditor(editor, true), false)
  const filled = customEditor({ modelId: "gw-model-1" })
  assert.deepEqual(editorMissingFields(filled, true), [])
  assert.equal(canSaveEditor(filled, true), true)
})

test("form hint：按表单从上到下列出名称 / 接口地址 / 密钥 / 模型；不需要密钥的不报密钥；socks 代理不算缺字段", () => {
  const empty = customEditor({ name: " ", endpoints: {}, keys: [], modelId: "" })
  assert.deepEqual(editorMissingFields(empty, true), ["name", "endpoint", "key", "model"])
  assert.deepEqual(editorMissingFields(empty, false), ["name", "endpoint", "model"])
  const socks = customEditor({ modelId: "m", proxy: "socks5://127.0.0.1:1080" })
  assert.deepEqual(editorMissingFields(socks, true), [])
  assert.equal(canSaveEditor(socks, true), false, "代理挡的，代理那栏自己标红")
  assert.deepEqual(editorMissingFields(null, true), [])
})

test("缺的字段在哪个页签：模型在「模型」页，其余在「连接」页", () => {
  assert.equal(missingFieldTab("model"), "models")
  assert.equal(missingFieldTab("name"), "connection")
  assert.equal(missingFieldTab("endpoint"), "connection")
  assert.equal(missingFieldTab("key"), "connection")
})

test("底栏一句：完整表单带页签名，simple 表单不带；中英", () => {
  const zh = translator(zhSettings as unknown as Record<string, unknown>)
  const en = translator(enSettings as unknown as Record<string, unknown>)
  assert.equal(missingSummaryText(["model"], zh, true), "还差：主力模型（在「模型」页）")
  assert.equal(missingSummaryText(["name", "model"], zh, false), "还差：显示名称、主力模型")
  assert.match(missingSummaryText(["model"], en, true), /^Still needed: .+ \(on the Models tab\)$/)
  assert.equal(missingSummaryText([], zh, true), "")
  for (const key of ["missingNameHint", "missingEndpointHint", "missingKeyHint", "missingModelHint", "missingTabAria"]) {
    assert.equal(typeof (zhSettings.providers as Record<string, unknown>)[key], "string", key)
    assert.equal(typeof (enSettings.providers as Record<string, unknown>)[key], "string", key)
  }
})

test("接线：模型栏下有提示、页签有圆点、底栏按钮灰着时有「还差」", () => {
  const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8")
  assert.match(read("./provider-models-tab.tsx"), /<MissingFieldHint missing=\{missing\} field="model" \/>/)
  assert.match(read("./provider-editor-fields.tsx"), /<MissingTabDot missing=\{missing\} tab="models" \/>/)
  assert.match(read("./provider-editor-drawer-chrome.tsx"), /\{missingHint && !canSave \? \(/)
  assert.match(read("./provider-editor-drawer.tsx"), /editorMissingFields\(editor, preset\.requiresKey \?\? true\)/)
})

test("leo soft-3：canSaveEditor 只有一套规则——什么都不缺且代理不挡才能存，所有组合都和 editorMissingFields 对得上", () => {
  const names = ["", "我的网关"]
  const endpoints = [{}, { openai: "https://llm-gw.example/v1" }]
  const keySets = [false, true]
  const models = ["", "gpt-x"]
  const proxies = ["", "http://127.0.0.1:7890", "socks5://127.0.0.1:1080"]
  let seen = 0
  for (const kind of ["custom", "openai"] as const)
    for (const name of names)
      for (const ep of endpoints)
        for (const withKey of keySets)
          for (const modelId of models)
            for (const proxy of proxies)
              for (const requiresKey of [true, false]) {
                const base = emptyEditor(kind)
                const editor: EditorState = {
                  ...base,
                  name,
                  endpoints: ep,
                  modelId,
                  proxy,
                  keys: base.keys.map((key) => ({ ...key, apiKey: withKey ? "sk-test" : "" }))
                }
                const expected = editorMissingFields(editor, requiresKey).length === 0 && !proxyBlocksSave(proxy)
                assert.equal(canSaveEditor(editor, requiresKey), expected, JSON.stringify({ kind, name, ep, withKey, modelId, proxy, requiresKey }))
                seen += 1
              }
  assert.equal(seen, 2 * 2 * 2 * 2 * 2 * 3 * 2)
  assert.equal(canSaveEditor(null, true), false)
  // 不再有第二份手写规则：canSaveEditor 直接调 editorMissingFields。
  const src = readFileSync(new URL("./providers.types.ts", import.meta.url), "utf8")
  const body = src.slice(src.indexOf("export function canSaveEditor"), src.indexOf("export type EditorMissingField"))
  assert.match(body, /editorMissingFields\(editor, requiresKey\)\.length === 0 && !proxyBlocksSave\(editor\.proxy\)/)
  assert.doesNotMatch(body, /modelId|hasEndpoint|apiKey/)
})

test("luna #170 r-luna ③：简易表单的自定义端点，名称放在最上面露着（不收进「高级」），「起个名字才能保存。」就在它下面；预设仍收在「高级」", () => {
  assert.equal(simpleNameUpFront("custom"), true)
  assert.equal(simpleNameUpFront("deepseek"), false)
  const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8")
  const simple = read("./provider-simple-fields.tsx")
  const up = simple.indexOf("{nameUpFront ? <ProviderNameField editor={editor} onChange={onChange} missing={missing} /> : null}")
  const details = simple.indexOf("<details")
  assert.ok(up >= 0 && details > up, "名称在「高级」<details> 之前（露着）")
  assert.match(simple, /const nameUpFront = simpleNameUpFront\(editor\.kind\)/)
  // 「高级」里不再画第二个名称栏、也不再提名称。
  assert.match(simple, /missing=\{missing\?\.filter\(\(field\) => \(field === "name" && !nameUpFront\) \|\| field === "endpoint"\)\}\s+showName=\{!nameUpFront\}/)
  const conn = read("./provider-connection-fields.tsx")
  assert.match(conn, /\{showName \? <ProviderNameField editor=\{editor\} onChange=\{onChange\} missing=\{missing\} \/> : null\}/)
  // 名称栏下面紧跟着缺名称的提示。
  const field = conn.slice(conn.indexOf("export function ProviderNameField"))
  assert.match(field, /placeholder=\{t\("settings\.providers\.namePlaceholder"\)\}[\s\S]*?\/>\s+<MissingFieldHint missing=\{missing\} field="name" \/>/)
})
