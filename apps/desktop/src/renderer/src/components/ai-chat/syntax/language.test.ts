import assert from "node:assert/strict"
import { test } from "node:test"
import { languageFromFenceLang, languageFromPath } from "./language.ts"

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

test("maps common fence aliases to highlighter languages", () => {
  assert.equal(languageFromFenceLang("ts"), "typescript")
  assert.equal(languageFromFenceLang("tsx"), "tsx")
  assert.equal(languageFromFenceLang("js"), "javascript")
  assert.equal(languageFromFenceLang("py"), "python")
  assert.equal(languageFromFenceLang("python"), "python")
  assert.equal(languageFromFenceLang("json"), "json")
  assert.equal(languageFromFenceLang("bash"), "bash")
  assert.equal(languageFromFenceLang("shell"), "bash")
  assert.equal(languageFromFenceLang("go"), "go")
  assert.equal(languageFromFenceLang("golang"), "go")
})

test("fence language is case-insensitive and falls back", () => {
  assert.equal(languageFromFenceLang("TSX"), "tsx")
  assert.equal(languageFromFenceLang(""), "plaintext")
  assert.equal(languageFromFenceLang("brainfuck"), "plaintext")
})
