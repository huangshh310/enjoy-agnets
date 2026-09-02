import assert from "node:assert/strict"
import { test } from "node:test"
import { parseHttpUrl } from "./http-url.ts"

test("accepts http(s) and fills https for bare hosts", () => {
  assert.equal(parseHttpUrl("https://react.dev/learn"), "https://react.dev/learn")
  assert.equal(parseHttpUrl("http://localhost:5173/"), "http://localhost:5173/")
  assert.equal(parseHttpUrl("react.dev"), "https://react.dev/")
})

test("rejects non-http schemes and empty input", () => {
  assert.equal(parseHttpUrl("javascript:alert(1)"), null)
  assert.equal(parseHttpUrl("file:///C:/tmp/index.html"), null)
  assert.equal(parseHttpUrl("data:text/html,hi"), null)
  assert.equal(parseHttpUrl("  "), null)
  assert.equal(parseHttpUrl(undefined), null)
})
