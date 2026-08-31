import assert from "node:assert/strict"
import { test } from "node:test"
import { fileGlyphFor } from "./file-kind.ts"

test("directories always use the folder glyph", () => {
  assert.equal(fileGlyphFor("src", "directory"), "folder")
  assert.equal(fileGlyphFor("login.html", "directory"), "folder")
})

test("maps common extensions like VS Code Seti", () => {
  assert.equal(fileMark("login.html"), "<>")
  assert.equal(fileMark("app.css"), "#")
  assert.equal(fileMark("main.ts"), "TS")
  assert.equal(fileMark("env.d.ts"), "TS")
  assert.equal(fileMark("page.tsx"), "TX")
  assert.equal(fileMark("README.md"), "MD")
})

test("special filenames beat the extension", () => {
  assert.equal(fileMark("package.json"), "npm")
  assert.equal(fileMark("Dockerfile"), "dk")
  assert.equal(fileMark(".gitignore"), "git")
})

test("unknown files fall back to a generic mark", () => {
  assert.equal(fileMark("notes.xyz"), "f")
})

test("glyph tones stay on semantic tokens", () => {
  const glyph = fileGlyphFor("login.html", "file")
  if (glyph === "folder") throw new Error("expected file glyph")
  assert.match(glyph.tone, /^(text-text-|text-accent-|text-chart-|text-docs-|text-state-)/)
})

function fileMark(name: string): string {
  const glyph = fileGlyphFor(name, "file")
  if (glyph === "folder") throw new Error(`expected file glyph for ${name}`)
  return glyph.mark
}
