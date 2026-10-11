import assert from "node:assert/strict"
import { test } from "node:test"
import {
  listComposerSkillChips,
  setComposerSkillChips,
  takeComposerSkillChips
} from "../../components/ai-chat/composer/mentions/composer-skill-chips.ts"
import { listComposerAssets, setComposerAssets, takeComposerAssetDetails } from "../composer-assets"
import { listQuotedContexts, setQuotedContexts, takeQuotedContexts } from "../quoted-context"
import {
  listSessionContextChips,
  setSessionContextChips,
  takeSessionContextChips
} from "../session-context-chips"
import { captureComposerSend, restoreComposerSendChips } from "./composer-send-snapshot.ts"

const quote = { id: "q1", source: "file", label: "readme.md", text: "# e2e" } as never
const skill = { id: "s1", name: "review", slash: "/review" } as never
const chip = { id: "doc:1", kind: "knowledge" as const, label: "Doc", enabled: true }
const asset = { id: "a1", name: "note.txt", mediaType: "text/plain" }

function seed() {
  setQuotedContexts([quote])
  setComposerSkillChips([skill])
  setSessionContextChips([chip])
  setComposerAssets([asset])
}

test("发送取走 Chip 后失败：快照把引用 / 技能 / 知识 Chip 原样还回，附件留在快照里给 restoreComposerDraft", () => {
  seed()
  const snapshot = captureComposerSend("please write a note")
  takeQuotedContexts()
  takeComposerSkillChips()
  takeSessionContextChips()
  takeComposerAssetDetails()
  restoreComposerSendChips(snapshot)
  assert.equal(snapshot.text, "please write a note")
  assert.deepEqual(snapshot.assets.map((item) => item.id), ["a1"])
  assert.deepEqual(listQuotedContexts().map((item) => item.id), ["q1"])
  assert.deepEqual(listComposerSkillChips().map((item) => item.id), ["s1"])
  assert.deepEqual(listSessionContextChips().map((item) => item.id), ["doc:1"])
  assert.deepEqual(listComposerAssets(), [])
})

test("还原不叠同 id 的 Chip", () => {
  seed()
  const snapshot = captureComposerSend("hi")
  restoreComposerSendChips(snapshot)
  assert.equal(listQuotedContexts().length, 1)
  assert.equal(listComposerSkillChips().length, 1)
  assert.equal(listSessionContextChips().length, 1)
})
