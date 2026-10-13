/**
 * luna 验收「在浏览器打开」：`write html` 触发 stub 真写 e2e-stub.html，并吐 write_file 调用 + 结果。
 */
import assert from "node:assert/strict"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"
import { setE2eStubPackagedForTest } from "./e2e-stub-gate.ts"
import { isWriteHtmlPrompt, STUB_HTML_CONTENT, STUB_HTML_PATH, stubHtmlWriteParts } from "./e2e-stub-write.ts"
import { resolveInsideWorkspace } from "./paths.ts"

test("触发词：please write html page", () => {
  assert.equal(isWriteHtmlPrompt("please write html page"), true)
  assert.equal(isWriteHtmlPrompt("please write a note"), false)
})

test("真落盘 .html，tool-result 指向同一路径", async () => {
  const root = await mkdtemp(join(tmpdir(), "enjoy-stub-html-"))
  const saved = { ws: process.env.ENJOY_E2E_WORKSPACE, stub: process.env.ENJOY_E2E_STUB, ud: process.env.ENJOY_E2E_USERDATA }
  process.env.ENJOY_E2E_STUB = "1"
  process.env.ENJOY_E2E_USERDATA = saved.ud || "/tmp/e2e-ud"
  setE2eStubPackagedForTest(false)
  try {
    const parts = await stubHtmlWriteParts("tool_html_1", root)
    assert.deepEqual(parts.map((part) => part.type), ["tool-call", "tool-result"])
    assert.deepEqual((parts[1] as { output: unknown }).output, { ok: true, path: STUB_HTML_PATH })
    assert.equal(await readFile(resolveInsideWorkspace(root, STUB_HTML_PATH), "utf8"), STUB_HTML_CONTENT)
  } finally {
    setE2eStubPackagedForTest(undefined)
    for (const [key, value] of [["ENJOY_E2E_STUB", saved.stub], ["ENJOY_E2E_USERDATA", saved.ud]] as const) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
})
