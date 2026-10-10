import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import {
  APP_TOAST_CLEARANCE_GAP,
  applyToastBottomCssVar,
  isDockedClearance,
  TOAST_BOTTOM_CSS_VAR,
  toastBottomOffsetFromClearance
} from "./toast-bottom-offset.ts"

const dir = dirname(fileURLToPath(import.meta.url))
const FALLBACK = 56

test("没有贴底 clearance 时回落固定垫", () => {
  assert.equal(
    toastBottomOffsetFromClearance({ viewportHeight: 900, rects: [], fallback: FALLBACK }),
    FALLBACK
  )
})

test("居中空会话 Composer 不抬 toast", () => {
  assert.equal(
    toastBottomOffsetFromClearance({
      viewportHeight: 900,
      rects: [{ top: 320, bottom: 520 }],
      fallback: FALLBACK
    }),
    FALLBACK
  )
  assert.equal(isDockedClearance({ top: 320, bottom: 520 }, 900), false)
})

test("贴底 Composer 按实测顶边抬高，清掉桌面芯片", () => {
  assert.equal(
    toastBottomOffsetFromClearance({
      viewportHeight: 900,
      rects: [{ top: 700, bottom: 852 }],
      fallback: FALLBACK
    }),
    900 - 700 + APP_TOAST_CLEARANCE_GAP
  )
})

test("贴底页脚矮于 fallback 时仍用 fallback", () => {
  assert.equal(
    toastBottomOffsetFromClearance({
      viewportHeight: 900,
      rects: [{ top: 860, bottom: 900 }],
      fallback: FALLBACK
    }),
    FALLBACK
  )
})

test("Composer 在状态栏上方仍算贴底，取更高顶边", () => {
  assert.equal(
    toastBottomOffsetFromClearance({
      viewportHeight: 920,
      rects: [
        { top: 710, bottom: 850 },
        { top: 850, bottom: 896 }
      ],
      fallback: FALLBACK
    }),
    920 - 710 + APP_TOAST_CLEARANCE_GAP
  )
})

test("多个贴底节点取最高顶边，居中节点忽略", () => {
  assert.equal(
    toastBottomOffsetFromClearance({
      viewportHeight: 900,
      rects: [
        { top: 360, bottom: 540 },
        { top: 852, bottom: 896 },
        { top: 720, bottom: 852 }
      ],
      fallback: FALLBACK
    }),
    900 - 720 + APP_TOAST_CLEARANCE_GAP
  )
})

test("高 Composer 顶边越过中线仍按贴底抬，不回落 56", () => {
  const offset = toastBottomOffsetFromClearance({
    viewportHeight: 700,
    rects: [{ top: 240, bottom: 656 }],
    fallback: FALLBACK
  })
  assert.equal(isDockedClearance({ top: 240, bottom: 656 }, 700), true)
  assert.equal(offset, 700 - 240 + APP_TOAST_CLEARANCE_GAP)
  assert.ok(offset > FALLBACK)
})

test("写入 CSS 变量供 Toaster 与检查用", () => {
  const props: Record<string, string> = {}
  applyToastBottomCssVar(188, {
    style: { setProperty: (name, value) => {
      props[name] = value
    } }
  })
  assert.equal(props[TOAST_BOTTOM_CSS_VAR], "188px")
})

test("Composer 簇 / 状态栏 / 自动化页脚都挂 data-toast-clearance", () => {
  const cluster = readFileSync(
    join(dir, "../components/app-shell/chat/chat-composer-cluster.tsx"),
    "utf8"
  )
  const composer = readFileSync(join(dir, "../components/ai-chat/ai-chat-composer.tsx"), "utf8")
  const status = readFileSync(join(dir, "../components/ai-chat/ai-chat-status-bar.tsx"), "utf8")
  const footer = readFileSync(
    join(dir, "../components/automations/components/automation-footer.tsx"),
    "utf8"
  )
  assert.match(cluster, /data-toast-clearance/)
  assert.match(composer, /data-toast-clearance/)
  assert.match(status, /data-toast-clearance/)
  assert.match(footer, /data-toast-clearance/)
})
