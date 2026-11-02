import assert from "node:assert/strict"
import { test } from "node:test"
import { highlightToHtml } from "./use-shiki-html.ts"

test("highlightToHtml wraps typescript tokens", async () => {
  const html = await highlightToHtml('const x: string = "hi"', "typescript", {
    lineNumbers: false
  })
  assert.match(html, /<pre[\s\S]*<code/)
  assert.match(html, /const/)
  // second call hits cache (same string)
  const again = await highlightToHtml('const x: string = "hi"', "typescript", {
    lineNumbers: false
  })
  assert.equal(again, html)
})

test("fence line numbers use background gutter class", async () => {
  const html = await highlightToHtml("a\nb", "plaintext", { lineNumbers: "fence" })
  assert.match(html, /text-background\/40/)
  assert.match(html, />1</)
  assert.match(html, />2</)
})
