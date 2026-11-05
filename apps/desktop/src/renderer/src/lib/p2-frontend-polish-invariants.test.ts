/**
 * P2 前端收口 soft · Must×6 源码不变式（不启 Electron）
 * 对照：p2-frontend-polish-arch.md / product / design · ALIGN 钉 + reduce 补洞
 */
import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const dir = dirname(fileURLToPath(import.meta.url))
const repo = join(dir, "../../../../../..")
const termDir = join(
  repo,
  "apps/desktop/src/renderer/src/components/ai-chat/right-pane/views/terminal"
)

function read(rel: string): string {
  return readFileSync(join(repo, rel), "utf8")
}

test("Must1: sonner@2.0.8 单出口 AppToaster + showAppToast；≥3 入口；禁平行 Host", () => {
  const ws = read("pnpm-workspace.yaml")
  assert.match(ws, /sonner:\s*\^2\.0\.8/)
  const app = read("apps/desktop/src/renderer/src/App.tsx")
  assert.match(app, /<AppToaster\s*\/>/)
  assert.doesNotMatch(app, /SkillSourceToastHost|CuratedToast|SessionPreviewToast/)
  const helper = read("apps/desktop/src/renderer/src/lib/app-toast.ts")
  assert.match(helper, /from "sonner"/)
  assert.match(helper, /export function showAppToast/)
  const toaster = read("packages/ui/components/ui/sonner.tsx")
  assert.match(toaster, /position="bottom-center"/)
  assert.match(toaster, /visibleToasts=\{3\}/)
  assert.match(toaster, /expand=\{false\}/)
  for (const gone of [
    "apps/desktop/src/renderer/src/components/skills/components/skill-source-toast-host.tsx",
    "apps/desktop/src/renderer/src/components/settings/extensions/curated/curated-toast.tsx",
    "apps/desktop/src/renderer/src/components/ai-chat/composer/session-review/preview-open/session-preview-toast.tsx"
  ]) {
    assert.equal(existsSync(join(repo, gone)), false, gone)
  }
  const skill = read("apps/desktop/src/renderer/src/components/skills/lib/skill-source-toast.ts")
  const curated = read(
    "apps/desktop/src/renderer/src/components/settings/extensions/curated/use-curated-add.ts"
  )
  const preview = read(
    "apps/desktop/src/renderer/src/components/ai-chat/composer/session-review/preview-open/use-open-session-preview.ts"
  )
  assert.match(skill, /showAppToast/)
  assert.match(curated, /showAppToast/)
  assert.match(preview, /showAppToast/)
})

test("Must2: xterm 5.5 + addon 精确钉；禁 xterm6 / peer^6", () => {
  const ws = read("pnpm-workspace.yaml")
  assert.match(ws, /"@xterm\/xterm":\s*\^5\.5\.0/)
  assert.doesNotMatch(ws, /"@xterm\/xterm":\s*\^6/)
  for (const [name, ver] of [
    ["@xterm/addon-webgl", "0.18.0"],
    ["@xterm/addon-search", "0.15.0"],
    ["@xterm/addon-web-links", "0.11.0"],
    ["@xterm/addon-unicode11", "0.8.0"]
  ] as const) {
    assert.match(ws, new RegExp(`${name.replace(/\//g, "\\/")}": "${ver}"`))
    assert.doesNotMatch(ws, new RegExp(`${name.replace(/\//g, "\\/")}": [\\^~]`))
  }
  const attach = readFileSync(join(termDir, "attach-xterm-addons.ts"), "utf8")
  assert.match(attach, /WebglAddon|attachWebglOrDom|attachXtermRenderer/)
  assert.match(attach, /SearchAddon/)
  assert.match(attach, /WebLinksAddon/)
  assert.match(attach, /Unicode11Addon/)
  assert.match(attach, /unicode\.activeVersion = "11"/)
})

test("Must3: 外链 requestOpenExternalQuiet → window.openExternal；禁 renderer window.open", () => {
  const openLink = readFileSync(join(termDir, "open-terminal-link.ts"), "utf8")
  const attach = readFileSync(join(termDir, "attach-xterm-addons.ts"), "utf8")
  const helper = read("apps/desktop/src/renderer/src/lib/open-safe-external.ts")
  assert.doesNotMatch(openLink, /window\.open\s*\(/)
  assert.doesNotMatch(attach, /window\.open\s*\(/)
  assert.doesNotMatch(helper, /window\.open\s*\(/)
  assert.match(attach, /requestOpenExternalQuiet/)
  assert.match(attach, /openTerminalLink\(/)
  assert.match(helper, /window\.openExternal/)
  const main = read("apps/desktop/src/main/ipc-shell.ts")
  assert.match(main, /"window\.openExternal"/)
  assert.match(main, /openExternalHttpUrl/)
  const wrap = read("apps/desktop/src/main/services/window-open-external.ts")
  assert.match(wrap, /export async function openExternalHttpUrl/)
  assert.match(wrap, /await open\(planned\.href\)/)
})

test("Must4: 落点仅 toast 呈现 + terminal addon；不换引擎", () => {
  const toaster = read("packages/ui/components/ui/sonner.tsx")
  assert.match(toaster, /SonnerToaster|from "sonner"/)
  assert.match(read("apps/desktop/src/renderer/src/components/layout/app-toaster.tsx"), /Toaster/)
  const attach = readFileSync(join(termDir, "attach-xterm-addons.ts"), "utf8")
  assert.match(attach, /from "@xterm\/addon-/)
  assert.doesNotMatch(attach, /@xterm\/xterm\/6|hterm|node-pty-ui/)
})

test("Must5: 零扩张 / 零回退钉 — 本刀不引入禁面关键词于落点文件", () => {
  const toaster = read("packages/ui/components/ui/sonner.tsx")
  const attach = readFileSync(join(termDir, "attach-xterm-addons.ts"), "utf8")
  const openLink = readFileSync(join(termDir, "open-terminal-link.ts"), "utf8")
  const blob = `${toaster}\n${attach}\n${openLink}`
  assert.doesNotMatch(blob, /tinykeys|@headless-tree|SessionList virtua|事件批/)
  assert.doesNotMatch(blob, /\bI3\b|ink\/⑤|Queue\/Steer/)
})

test("Must6 + reduce: 用户面诚实级 + reduce 静帧 CSS 契约", () => {
  const reduce = read("packages/ui/components/ui/sonner-reduce-motion.css")
  assert.match(reduce, /prefers-reduced-motion:\s*reduce/)
  assert.match(reduce, /\[data-sonner-toast\]/)
  assert.match(reduce, /transition:\s*none\s*!important/)
  assert.match(reduce, /animation:\s*none\s*!important/)
  const toaster = read("packages/ui/components/ui/sonner.tsx")
  assert.match(toaster, /sonner-reduce-motion\.css/)
  // 空成功禁词不该出现在 toast 呈现层
  assert.doesNotMatch(toaster, /前端全面重构|性能大升级|性能翻倍/)
})
