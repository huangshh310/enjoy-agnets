import assert from "node:assert/strict"
import { test } from "node:test"
import { extensionOf, fileNameOf } from "./file-name.ts"

test("fileNameOf strips directories and lowercases", () => {
  assert.equal(fileNameOf("src/Login.HTML"), "login.html")
  assert.equal(fileNameOf("C:\\repo\\README.md"), "readme.md")
})

test("extensionOf treats declaration files as d.ts", () => {
  assert.equal(extensionOf("env.d.ts"), "d.ts")
  assert.equal(extensionOf("main.ts"), "ts")
  assert.equal(extensionOf("LICENSE"), undefined)
})
