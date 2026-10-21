/**
 * luna #170 r-luna ④（12c）：「正在准备…」左边和输入框里的字对齐；只改位置，画 / 收的时机不动。
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"
import { COMPOSER_FRAMED_TEXT_INSET_CLASS, COMPOSER_TEXT_INSET_CLASS, preparingHintInsetClass } from "./composer-preparing-hint-inset.ts"

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8")

test("有消息（Composer 自带 px-6）让出 1.5rem + 字的内边距；空会话（簇带 px-6）只让字的内边距", () => {
  assert.equal(preparingHintInsetClass(true), COMPOSER_FRAMED_TEXT_INSET_CLASS)
  assert.equal(preparingHintInsetClass(false), COMPOSER_TEXT_INSET_CLASS)
  assert.equal(COMPOSER_TEXT_INSET_CLASS, "pl-[calc(0.875rem+1px)]")
  assert.match(COMPOSER_FRAMED_TEXT_INSET_CLASS, /^pl-\[calc\(1\.5rem\+0\.875rem\+1px\)\] pr-6$/)
})

test("对得上的前提：Composer 外层 px-6、外框 1px 边框、输入区 px-3.5；簇空会话 px-6 / Composer px-0，有消息时簇不加左右内边距", () => {
  const composer = read("../../ai-chat/ai-chat-composer.tsx")
  assert.match(composer, /cx\("relative flex flex-col w-full min-w-0 px-6 pb-2", className\)/)
  assert.match(composer, /"border border-border-button-default bg-background-secondary-default/)
  assert.match(read("../../ai-chat/composer/mentions/composer-input.tsx"), /<div ref=\{wrapRef\} className="relative px-3\.5 py-1">/)
  const stage = read("./chat-stage.tsx")
  assert.match(stage, /\? "mx-auto w-full max-w-3xl shrink-0 px-6"/)
  assert.match(stage, /props\.empty \? "px-0 pb-2 \[&_textarea\]:min-h-\[72px\]"/)
  assert.match(stage, /dock=\{props\.empty\}/)
})

test("接线：簇按 dock=false（有消息）传 composerFramed；提示不再是 px-1；不碰 preparingHint 的设 / 收", () => {
  assert.match(read("./chat-composer-cluster.tsx"), /<ComposerPreparingHint composerFramed=\{props\.dock === false\} \/>/)
  const hint = read("./composer-preparing-hint.tsx")
  assert.match(hint, /className=\{cx\("pb-1\.5 text-caption-2-regular text-text-secondary", preparingHintInsetClass\(composerFramed\)\)\}/)
  assert.doesNotMatch(hint, /px-1\b/)
  assert.doesNotMatch(hint, /setPreparingHint/)
})
