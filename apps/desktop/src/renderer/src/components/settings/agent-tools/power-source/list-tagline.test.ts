/**
 * 列表副标题键：已知助手短句，未知走默认。
 */
import assert from "node:assert/strict"
import { test } from "node:test"
import { listTaglineKey } from "./list-tagline.ts"

test("已知助手走 listLine，未知走默认短句", () => {
  assert.equal(listTaglineKey("grok"), "settings.agentTools.listLine.grok")
  assert.equal(listTaglineKey("enjoy-local"), "settings.agentTools.listLine.enjoy-local")
  assert.equal(listTaglineKey("custom:foo"), "settings.agentTools.listLineDefault")
})
