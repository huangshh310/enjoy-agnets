import assert from "node:assert/strict"
import { test } from "node:test"
import { languageFromPath } from "./language.ts"

test("maps common source extensions to a highlighter language", () => {
  assert.equal(languageFromPath("src/login.html"), "html")
  assert.equal(languageFromPath("styles/app.css"), "css")
  assert.equal(languageFromPath("main.ts"), "typescript")
  assert.equal(languageFromPath("env.d.ts"), "typescript")
  assert.equal(languageFromPath("page.tsx"), "tsx")
  assert.equal(languageFromPath("README.md"), "markdown")
})

test("special filenames beat the extension", () => {
  assert.equal(languageFromPath("tsconfig.json"), "jsonc")
  assert.equal(languageFromPath("Dockerfile"), "dockerfile")
  assert.equal(languageFromPath(".gitignore"), "gitignore")
})

test("unknown files fall back to plaintext", () => {
  assert.equal(languageFromPath("notes.xyz"), "plaintext")
  assert.equal(languageFromPath("LICENSE"), "plaintext")
})
