/**
 * 玻璃/墨线/素描外壳装饰：审查与启动空态必须停渲染，禁止靠 z-index 不透明底盖住环。
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))

function readFirst(paths: string[]): string {
  const hit = paths.find((path) => existsSync(path))
  assert.ok(hit, `missing ${paths.join(" | ")}`)
  return readFileSync(hit, "utf8")
}

const skinRootCandidates = [
  join(dir, "../../../../../packages/ui/styles/skins"),
  join(dir, "../../../../../../packages/ui/styles/skins")
]
function readSkin(file: string): string {
  for (const root of skinRootCandidates) {
    const path = join(root, file)
    if (existsSync(path)) return readFileSync(path, "utf8")
  }
  assert.fail(`missing ${file} under packages/ui/styles/skins`)
}

test("玻璃 ::after 棱镜描边 z-index 必须是 0，禁止再盖正文", () => {
  const glass = readSkin("glass.css")
  const afterBlocks = [...glass.matchAll(/::after\s*\{([^}]+)\}/g)].map((match) => match[1] ?? "")
  assert.ok(afterBlocks.length >= 1, "glass.css 必须有 ::after")
  for (const block of afterBlocks) {
    if (!block.includes("mask-composite") && !block.includes("skin-liquid-glass")) continue
    assert.match(block, /z-index:\s*0/, "棱镜描边必须 z-index: 0")
    assert.doesNotMatch(block, /z-index:\s*[1-9]/, "棱镜描边禁止 z-index > 0")
  }
  assert.doesNotMatch(glass, /::after[^{]*\{[^}]*z-index:\s*2/, "禁止把 ::after 抬回 z-index: 2")
})

test("审查与右栏外壳任何状态都不挂装饰，不看 GPU", () => {
  const pane = readFirst([join(dir, "../components/ai-chat/right-pane/right-pane.tsx")])
  assert.match(pane, /data-pane-shell-deco="off"/)
  assert.doesNotMatch(pane, /data-frost=\{/)
  assert.doesNotMatch(pane, /data-frost="shell"/)
  assert.doesNotMatch(pane, /reviewEmpty/)
  assert.doesNotMatch(pane, /bg-background-primary-default/)
  const logic = readFirst([join(dir, "../components/ai-chat/right-pane/right-pane-shell-frost.logic.ts")])
  assert.match(logic, /return false/)
  assert.doesNotMatch(logic, /return true/)
  assert.doesNotMatch(logic, /reviewDecorEmpty/)
  const inspector = readFirst([join(dir, "../components/app-shell/layout/inspector-pane.tsx")])
  assert.match(inspector, /right-pane-panel/)
  assert.doesNotMatch(inspector, /className="min-h-0 bg-transparent"/)
})

test("皮肤 CSS 必须识别 data-pane-shell-deco=off 并去掉伪元素装饰", () => {
  const glass = readSkin("glass.css")
  const ink = readSkin("ink.css")
  const sketch = readSkin("sketch.css")
  assert.match(glass, /\[data-pane-shell-deco="off"\]::after/)
  assert.match(glass, /content:\s*none/)
  assert.match(glass, /\[data-pane-shell-deco="off"\][\s\S]*background-color:\s*#fff/)
  const globals = readSkin("../globals.css")
  assert.match(globals, /\[data-testid="right-pane-shell"\][\s\S]*background-color:\s*#ffffff\s*!important/)
  assert.match(globals, /html\[data-gpu-compositing="off"\] \*[\s\S]*backdrop-filter:\s*none\s*!important/)
  assert.match(globals, /\.skin-glass-orbs[\s\S]*display:\s*none\s*!important/)
  assert.match(globals, /\.skin-glass-orb[\s\S]*display:\s*none\s*!important/)
  assert.match(globals, /\.skin-glass-mesh-gradient[\s\S]*display:\s*none\s*!important/)
  assert.match(globals, /html:not\(\[data-gpu-compositing="on"\]\) aside\.rounded-3xl[\s\S]*background-color:\s*#ffffff\s*!important/)
  assert.match(globals, /html:not\(\[data-gpu-compositing="on"\]\) main::before[\s\S]*content:\s*none\s*!important/)
  const canvas = readSkin("glass-canvas.css")
  assert.match(canvas, /\[data-gpu-compositing="on"\] \.skin-glass-orbs/)
  assert.match(canvas, /:not\(\[data-gpu-compositing="on"\]\) \.skin-glass-orb/)
  assert.match(ink, /\[data-pane-shell-deco="off"\][\s\S]*rounded-3xl\.shadow-card/)
  assert.match(ink, /:not\(\[data-pane-shell-deco="off"\]\)/)
  assert.match(sketch, /:not\(\[data-pane-shell-deco="off"\]\)/)
  assert.match(sketch, /\[data-pane-shell-deco="off"\][\s\S]*background-image:\s*none/)
})

test("无 GPU 旗标关掉棱镜 ::after 和 liquid-glass 滤镜", () => {
  const glass = readSkin("glass.css")
  const main = readFirst([
    join(dir, "../../../main/index.ts"),
    join(dir, "../../../../main/index.ts")
  ])
  const watch = readFirst([
    join(dir, "../../../main/services/gpu-compositing-watch.ts"),
    join(dir, "../../../../main/services/gpu-compositing-watch.ts")
  ])
  const preload = readFirst([
    join(dir, "../../../preload/index.ts"),
    join(dir, "../../../../preload/index.ts")
  ])
  assert.match(glass, /@supports\s*\(mask-composite:\s*exclude\)/)
  assert.match(glass, /\[data-gpu-compositing="on"\][\s\S]*::after/)
  assert.match(glass, /\[data-gpu-compositing="on"\][\s\S]*aside\.rounded-3xl::before/)
  assert.doesNotMatch(glass, /html\[data-skin="glass"\] aside\.rounded-3xl::before/)
  assert.doesNotMatch(glass, /:not\(\[data-gpu-compositing="off"\]\)[\s\S]*mask-composite/)
  assert.match(glass, /\[data-gpu-compositing="off"\][\s\S]*::after[\s\S]*content:\s*none/)
  assert.match(glass, /\[data-gpu-compositing="off"\][\s\S]*filter:\s*none/)
  assert.match(glass, /\[data-testid="right-pane-shell"\]::after/)
  assert.match(glass, /url\(#skin-liquid-glass\)/)
  assert.match(main, /getGPUFeatureStatus/)
  assert.match(main, /child-process-gone/)
  assert.match(main, /attachGpuCompositingWatch/)
  assert.match(watch, /gpu-info-update/)
  assert.match(watch, /child-process-gone/)
  assert.match(main, /additionalArguments/)
  assert.match(main, /gpuCompositingArg/)
  assert.match(preload, /applyGpuCompositingAttr/)
  assert.match(preload, /enjoyGpuCompositing/)
})

test("审查空态组件不挂 data-frost，不靠装饰类名", () => {
  const reviewEmpty = readFirst([
    join(dir, "../components/ai-chat/right-pane/views/review/diff-stream/review-diff-pane.tsx")
  ])
  const fileListEmpty = readFirst([
    join(dir, "../components/ai-chat/right-pane/views/review/file-tree/review-file-tree.tsx")
  ])
  const changesEmpty = readFirst([
    join(dir, "../components/ai-chat/right-pane/views/review/changes-list.tsx")
  ])
  for (const src of [reviewEmpty, fileListEmpty, changesEmpty]) {
    assert.doesNotMatch(src, /data-frost/)
    assert.doesNotMatch(src, /data-pane-shell-deco/)
    assert.doesNotMatch(src, /skin-glass-orb|skin-liquid-glass/)
    assert.doesNotMatch(src, /isolate|z-10/)
  }
  assert.match(reviewEmpty, /data-testid="review-diff-empty"/)
  assert.match(reviewEmpty, /chat\.treeClean/)
  assert.match(fileListEmpty, /review-file-list-empty/)
})
