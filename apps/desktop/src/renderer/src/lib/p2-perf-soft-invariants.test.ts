/**
 * P2 性能品味 soft · 源码不变式（leo Must×7 tip 自核）
 */
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { test } from "node:test"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "../../../../../..")

function read(...parts: string[]) {
  return readFileSync(join(root, ...parts), "utf8")
}

test("Must2 · Composer BorderBeam 仅 live work，非 focus||draft 持运", () => {
  const src = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-composer.tsx")
  assert.doesNotMatch(src, /active=\{isFocused\s*\|\|\s*running\s*\|\|\s*hasDraft\}/)
  assert.match(src, /active=\{liveAgentWork\}/)
  assert.match(src, /liveAgentWork\s*=\s*Boolean\(running\s*\|\|\s*pendingApproval\)/)
  assert.match(src, /isFocused\s*&&\s*"border-border-focus-ring/)
})

test("Must2 · Knowledge BorderBeam 仍绑 isSearching（勿动）", () => {
  const src = read(
    "apps/desktop/src/renderer/src/components/knowledge/components/retrieval/knowledge-retrieval-query-bar.tsx"
  )
  assert.match(src, /active=\{isSearching\}/)
})

test("Must1/4 · glass orb idle float 闸停；减动静帧非 80s", () => {
  const css = read("packages/ui/styles/skins/glass-canvas.css")
  assert.doesNotMatch(css, /animation:\s*glassOrbFloat\d/)
  assert.doesNotMatch(css, /animation-duration:\s*80s/)
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.skin-glass-orb[\s\S]*?animation:\s*none/)
})

test("Must1 · day-night-toggle-fx 夜间 infinite 闸停", () => {
  const css = read("packages/ui/components/application/theme/day-night-toggle-fx.css")
  assert.doesNotMatch(css, /animation:\s*theme-switch-shooting-star[^;]*infinite/)
  assert.doesNotMatch(css, /animation:\s*theme-switch-meteor[^;]*infinite/)
  assert.doesNotMatch(css, /animation:\s*theme-switch-aurora[^;]*infinite/)
  assert.doesNotMatch(css, /animation:\s*theme-switch-twinkle[^;]*infinite/)
  assert.doesNotMatch(css, /animation:\s*theme-switch-comet[^;]*infinite/)
})

test("Should · chart-reveal ≤400ms；减动静帧", () => {
  const css = read("packages/ui/styles/globals.css")
  assert.match(css, /\.animate-chart-reveal\s*\{[^}]*animation:\s*chart-reveal\s+400ms/s)
  assert.doesNotMatch(css, /chart-reveal\s+1800ms/)
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.animate-chart-reveal[^}]*animation:\s*none/s
  )
})

test("Must5 · 本刀未引入 virtua / tanstack-virtual", () => {
  const composer = read("apps/desktop/src/renderer/src/components/ai-chat/ai-chat-composer.tsx")
  assert.doesNotMatch(composer, /from ["']virtua["']|@tanstack\/react-virtual|VList/)
})
