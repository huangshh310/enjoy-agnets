import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const src = readFileSync(new URL("./settings-update-card.tsx", import.meta.url), "utf8")

test("开发版本不画检查更新按钮", () => {
  assert.match(src, /snapshot\.status === "dev"/)
  assert.match(src, /settings\.update\.devSkip/)
  assert.match(src, /isDev \?/)
})
