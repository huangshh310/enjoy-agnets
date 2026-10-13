import assert from "node:assert/strict"
import { test } from "node:test"
import { footerHint } from "./footer-hint.ts"

const t = (key: string) => key

test("含手动就不出「到点才跑」提示；只按真实触发方式出", () => {
  assert.equal(footerHint(["manual"], t), null)
  assert.equal(footerHint(["manual", "cron"], t), null)
  assert.equal(footerHint([], t), null)
  assert.equal(footerHint(["cron"], t), "studio.automations.cronNoRun")
  assert.equal(footerHint(["on_save"], t), "studio.automations.onSaveNoRun")
  assert.equal(footerHint(["cron", "webhook"], t), "studio.automations.webhookNoRun")
})
