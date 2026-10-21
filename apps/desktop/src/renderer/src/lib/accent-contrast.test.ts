/**
 * luna h163 对比度巡检（P2 / P3）：五种强调色 × 亮 / 暗 × 经典 / glass（无 GPU 回退，luna 真机就是这条路），
 * 直接读 theme.css / glass.css / globals.css 和组件源码里的类名算 WCAG 对比度。字 ≥ 4.5，图形 ≥ 3。
 *
 * 打印整张表：ACCENT_CONTRAST_REPORT=1 node --experimental-strip-types --test src/renderer/src/lib/accent-contrast.test.ts
 *
 * glass 开 GPU 时底下是桌面壁纸（透明窗），算不出确定值，这里不算；回退路径的底色是 globals.css 里写死的
 * #fff / #fafafa（亮）与 neutral-900 / #1c1c1c（暗），下面有断言盯着。
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { THEME_ACCENTS } from "../hooks/use-theme-accent.ts"
import { HEATMAP_LEVEL_CLASSES } from "../components/account/constants.ts"
import {
  contrast,
  gradientStops,
  layerScope,
  over,
  parseCssDecls,
  resolveColor,
  rgbToOklch,
  twColor,
  type Rgba
} from "./css-contrast.ts"

const repo = new URL("../../../../../../", import.meta.url)
const read = (rel: string) => readFileSync(new URL(rel, repo), "utf8")
const src = (rel: string) => read(`apps/desktop/src/renderer/src/${rel}`)

const twTheme = readFileSync(createRequire(import.meta.url).resolve("tailwindcss/theme.css"), "utf8")
const themeCss = read("packages/ui/styles/theme.css")
const glassCss = read("packages/ui/styles/skins/glass.css")
const globalsCss = read("packages/ui/styles/globals.css")
const table = parseCssDecls(globalsCss, parseCssDecls(glassCss, parseCssDecls(themeCss, parseCssDecls(twTheme))))

type Mode = "light" | "dark"
type Skin = "classic" | "glass"
type Area = "main" | "drawer" | "sidebar"
type Ctx = { accent: (typeof THEME_ACCENTS)[number]; mode: Mode; skin: Skin }

const CONTEXTS: Ctx[] = THEME_ACCENTS.flatMap((accent) =>
  (["light", "dark"] as const).flatMap((mode) => (["classic", "glass"] as const).map((skin) => ({ accent, mode, skin })))
)

const NO_GPU = 'html[data-skin="glass"]:not([data-gpu-compositing="on"])'
const NO_GPU_DARK = 'html.dark[data-skin="glass"]:not([data-gpu-compositing="on"])'

function scope(ctx: Ctx, area: Area): Map<string, string> {
  const dark = ctx.mode === "dark"
  const glass = ctx.skin === "glass"
  const sels = ["@theme default", "@theme", ":root"]
  if (dark) sels.push(".dark", ".dark[data-accent]")
  sels.push(`:root[data-accent="${ctx.accent.id}"]`)
  if (glass) {
    sels.push('html[data-skin="glass"]')
    if (dark) sels.push('html.dark[data-skin="glass"]')
    sels.push(NO_GPU)
    if (dark) sels.push(NO_GPU_DARK)
    // 抽屉（SettingsSideDrawer）和左侧导航卡都是 aside.rounded-3xl，回退时吃同一套侧栏 token。
    if (area !== "main") {
      sels.push(`${NO_GPU} aside.rounded-3xl`)
      if (dark) sels.push(`${NO_GPU_DARK} aside.rounded-3xl`)
    }
  }
  // use-theme-accent.ts 行内写的 500 / 600 优先级最高。
  return layerScope(table, sels, { "--color-accent-500": ctx.accent.c500, "--color-accent-600": ctx.accent.c600 })
}

/** 类名里的颜色片段 → 表达式。shadcn 别名（primary / input）是不带 --color- 前缀的变量。 */
const expr = (token: string) => {
  const [name, alpha] = token.split("/")
  if (name === "primary" || name === "input") return twColor(`var(--${name})${alpha ? `/${alpha}` : ""}`)
  return twColor(token)
}
const col = (ctx: Ctx, area: Area, token: string) => resolveColor(expr(token), scope(ctx, area))
const WHITE: Rgba = { r: 1, g: 1, b: 1, a: 1 }

/** 某块区域自身的不透明底色。 */
function surface(ctx: Ctx, area: Area): Rgba {
  const dark = ctx.mode === "dark"
  if (ctx.skin === "glass") {
    // globals.css 无 GPU 回退：main 纯白 / neutral-900，aside 卡 #fafafa / #1c1c1c（!important）。
    if (area === "main") return dark ? col(ctx, area, "neutral-900") : WHITE
    return resolveColor(dark ? "#1c1c1c" : "#fafafa", scope(ctx, area))
  }
  const full = col(ctx, area, "background-full")
  return over(col(ctx, area, area === "sidebar" ? "background-secondary-default" : "background-primary-default"), full)
}
/** 在 base 上依次叠若干层（类名片段）。 */
const stack = (ctx: Ctx, area: Area, base: Rgba, ...tokens: string[]) =>
  tokens.reduce((acc, t) => over(col(ctx, area, t), acc), base)
/** 主栏里的卡片（settings-card、main .rounded-2xl.border）：经典是 primary 底，glass 是 frost tile。 */
const card = (ctx: Ctx) =>
  ctx.skin === "glass"
    ? over(resolveColor("var(--skin-frost-tile)", scope(ctx, "main")), surface(ctx, "main"))
    : surface(ctx, "main")

type Check = { item: string; label: string; min: number | null; fg: Rgba; bg: Rgba }
const TEXT = 4.5
const GRAPHIC = 3
const HEAT_STEP = 1.15

const pick = (s: string, re: RegExp, what: string) => {
  const m = re.exec(s)
  assert.ok(m, `源码里找不到：${what}`)
  return m
}
/** 从类名串里取强调色色阶：亮色是不带前缀的那个，暗色取 dark: 的（没有就同亮色）。 */
const lightDark = (cls: string, prop: string) => {
  const l = new RegExp(`(?:^|\\s)${prop}-(accent-\\d+(?:/\\d+)?)`).exec(cls)
  const d = new RegExp(`(?:^|\\s)dark:${prop}-(accent-\\d+(?:/\\d+)?)`).exec(cls)
  assert.ok(l, `${cls} 缺 ${prop}`)
  return { light: l[1]!, dark: (d ?? l)[1]! }
}

// ---------- 源码扫描：白字落在实心强调色上的地方 ----------
function whiteOnAccentShades(): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>()
  for (const root of ["apps/desktop/src/renderer/src", "packages/ui"]) {
    const base = new URL(`${root}/`, repo)
    for (const rel of readdirSync(base, { recursive: true }) as string[]) {
      if (!/\.tsx?$/.test(rel) || rel.includes("node_modules") || rel.endsWith(".test.ts")) continue
      const lines = readFileSync(new URL(rel, base), "utf8").split("\n")
      lines.forEach((line, i) => {
        // 同一行有白字，或者是白色图标外面那层（下一行是白字图标）
        const white = /text-(?:text-)?white\b/.test(line) || /text-(?:text-)?white\b/.test(lines[i + 1] ?? "")
        if (!white) return
        for (const m of line.matchAll(/(?<![\w-])(?:hover:)?bg-accent-(\d+)(?![\d/])/g)) {
          const key = m[0]
          const set = found.get(key) ?? new Set<string>()
          set.add(`${root}/${rel}:${i + 1}`)
          found.set(key, set)
        }
      })
    }
  }
  return found
}

function checks(ctx: Ctx): Check[] {
  const out: Check[] = []
  const dark = ctx.mode === "dark"
  const add = (item: string, label: string, min: number | null, fg: Rgba, bg: Rgba) => out.push({ item, label, min, fg, bg })

  // P2-1 白字主按钮：渐变两端 + 所有实心白字按钮
  const main = scope(ctx, "main")
  for (const state of ["default", "hover", "active"] as const) {
    const stops = gradientStops(`var(--gradient-button-primary-${state})`, main)
    const name = { default: "常态", hover: "悬停", active: "按下" }[state]
    add("P2-1", `主按钮渐变·${name}·顶`, TEXT, WHITE, stops[0]!)
    add("P2-1", `主按钮渐变·${name}·底`, TEXT, WHITE, stops.at(-1)!)
  }
  for (const key of [...whiteOnAccentShades().keys()].sort()) {
    add("P2-1", `白字实心按钮 ${key}`, TEXT, WHITE, col(ctx, "main", key.replace(/^(?:hover:)?bg-/, "")))
  }

  // P2-2 热力图：最浅一档对卡片 ≥ 3；相邻两档 ≥ 1.25（看得出差别）
  const levels = ([1, 2, 3, 4] as const).map((n) => {
    const { light, dark: d } = lightDark(HEATMAP_LEVEL_CLASSES[n], "bg")
    return col(ctx, "main", dark ? d : light)
  })
  const heatCard = card(ctx)
  add("P2-2", "热力图·最浅数据档 vs 卡片", GRAPHIC, levels[0]!, heatCard)
  // 暗色从 500 往亮走，现成色阶里最优组合的最小值是 1.17（蓝 500 → 400，theme.css 把 blue-400 调深了）。
  for (let i = 1; i < levels.length; i++) add("P2-2", `热力图·第 ${i} / ${i + 1} 档区分`, HEAT_STEP, levels[i]!, levels[i - 1]!)

  // P2-3 「已配置」计数 / 技能 Store 角标
  const prov = src("components/settings/providers/providers-settings.tsx")
  const chip = lightDark(pick(prov, /"(bg-accent-50 text-accent-\d+ dark:bg-accent-950 dark:text-accent-\d+)"/, "已配置计数")[1]!, "text")
  add("P2-3", "设置·「已配置」计数", TEXT, col(ctx, "main", dark ? chip.dark : chip.light), col(ctx, "main", dark ? "accent-950" : "accent-50"))
  const tb = src("components/skills/components/skills-toolbar.tsx")
  const store = lightDark(pick(tb, /"(rounded-full bg-accent-500\/10 [^"]*)"/, "Store 角标")[1]!, "text")
  const storeFg = col(ctx, "main", dark ? store.dark : store.light)
  const tabRow = stack(ctx, "main", card(ctx), "background-secondary-default/70")
  add("P2-3", "技能·Store 角标（未选中页签上）", TEXT, storeFg, stack(ctx, "main", tabRow, "accent-500/10"))
  add("P2-3", "技能·Store 角标（选中页签上）", TEXT, storeFg, stack(ctx, "main", tabRow, "background-primary-default", "accent-500/10"))

  // P2-4 开关：关态轨道的边界 / 开态轨道 vs 抽屉里的卡片（catch-up 卡 = secondary 底）
  // 只看轨道（SwitchPrimitive.Root）的类名；滑块那串里也有 dark:data-[state=checked]:bg-…。
  const sw = pick(read("packages/ui/components/ui/switch.tsx"), /SwitchPrimitive\.Root[\s\S]*?className=\{cn\(\s*"([^"]*)"/, "开关轨道类名")[1]!
  const drawerCard = stack(ctx, "drawer", surface(ctx, "drawer"), "background-secondary-default")
  const offBorder = /data-\[state=unchecked\]:border-([\w-]+)/.exec(sw)
  // --input 在 :root 上算好再继承（glass 根上是 white 58%），所以按主栏作用域取。
  const offTrack = over(col(ctx, "main", dark ? "input/80" : "input"), drawerCard)
  add("P2-4", "开关·关态轨道边界", GRAPHIC, offBorder ? col(ctx, "drawer", offBorder[1]!) : offTrack, drawerCard)
  const on = /dark:data-\[state=checked\]:bg-([\w-]+)/.exec(sw)
  const onLight = pick(sw, /(?<!:)data-\[state=checked\]:bg-([\w-]+)/, "开关开态")[1]!
  add("P2-4", "开关·开态轨道", GRAPHIC, col(ctx, "drawer", dark && on ? on[1]! : onLight), drawerCard)

  // P2-5 侧栏选中行 / 搜索框（glass 暗色回退出过 #f7f7f7 底）
  const row = src("components/ai-chat/sidebar/sidebar-session-row.tsx")
  const [, rowBg, rowFg] = pick(row, /active\s*\?\s*"bg-([\w-]+) text-([\w-]+)"/, "会话行选中")
  const side = surface(ctx, "sidebar")
  const rowSurface = stack(ctx, "sidebar", side, rowBg!)
  // 这一项（luna P2-5）是 glass 的；经典皮肤的 text-secondary（亮 neutral-500 / 暗没覆盖也是 neutral-500）不在这次范围，只记录。
  const glassOnly = ctx.skin === "glass" ? TEXT : null
  const tag = ctx.skin === "glass" ? "glass" : "经典·仅记录"
  add("P2-5", `侧栏·选中会话行文字（${tag}）`, glassOnly, col(ctx, "sidebar", rowFg!), rowSurface)
  add("P2-5", `侧栏·选中会话行时间（${tag}）`, glassOnly, col(ctx, "sidebar", "text-secondary"), rowSurface)
  assert.match(src("components/ai-chat/ai-chat-sidebar.tsx"), /items-center bg-background-tertiary-default /)
  const search = stack(ctx, "sidebar", side, "background-tertiary-default")
  add("P2-5", `侧栏·快速搜索框文字（${tag}）`, glassOnly, col(ctx, "sidebar", "text-secondary"), search)
  assert.match(src("components/app-shell/chrome/module-nav.tsx"), /bg-background-tertiary-default\/80 /)
  const navSearch = stack(ctx, "sidebar", side, "background-tertiary-default/80")
  add("P2-5", `设置导航·搜索框输入字（${tag}）`, glassOnly, col(ctx, "sidebar", "text-primary"), navSearch)

  // P2-6 外观页·未选中的皮肤名（常态 / 悬停）
  const skin = src("components/settings/appearance/appearance-skin-card.tsx")
  const [, skinFg, skinHover] = pick(skin, /: "text-([\w-]+) group-hover:text-([\w-]+)"/, "皮肤名未选中")
  add("P2-6", "外观·未选中皮肤名", TEXT, col(ctx, "main", skinFg!), card(ctx))
  add("P2-6", "外观·未选中皮肤名（悬停）", TEXT, col(ctx, "main", skinHover!), card(ctx))

  // P2-7 分段控件未选中项
  const pillBg = stack(ctx, "drawer", surface(ctx, "drawer"), "background-secondary-default")
  const trig = src("components/automations/components/trigger-pills.tsx")
  add("P2-7", "自动化·触发方式未选中", TEXT, col(ctx, "drawer", pick(trig, /: "bg-background-secondary-default text-([\w-]+) /, "触发未选中")[1]!), pillBg)
  const mode = src("components/automations/components/mode-pills.tsx")
  add("P2-7", "自动化·模式未选中", TEXT, col(ctx, "drawer", pick(mode, /text-text-white" : "text-([\w-]+)"/, "模式未选中")[1]!), pillBg)
  const tog = src("components/ai-chat/composer/explore-execute/explore-execute-toggle.tsx")
  const composer =
    ctx.skin === "glass"
      ? over(resolveColor("var(--skin-frost-chip)", main), surface(ctx, "main"))
      : stack(ctx, "main", surface(ctx, "main"), "background-primary-default")
  add("P2-7", "输入框·探索/执行未选中", TEXT, col(ctx, "main", pick(tog, /!active && "text-([\w-]+)"/, "探索未选中")[1]!), composer)
  add("P2-7", "输入框·探索/执行未选中（悬停）", TEXT, col(ctx, "main", pick(tog, /!active && !disabled && "hover:text-([\w-]+)"/, "探索悬停")[1]!), composer)
  const explore = lightDark(pick(tog, /"(bg-accent-500\/15 font-medium text-accent-\d+ dark:text-accent-\d+[^"]*)"/, "探索选中")[1]!, "text")
  add("P2-7", "输入框·「探索」选中字", TEXT, col(ctx, "main", dark ? explore.dark : explore.light), stack(ctx, "main", composer, "accent-500/15"))

  // P3-8 glass 次级字回到中性灰（这里只算 glass；经典皮肤的 tertiary 不在这次范围）
  if (ctx.skin === "glass") {
    for (const [token, name] of [["text-secondary", "次级字"], ["text-tertiary", "三级字 / 时间戳"], ["text-placeholder", "占位符"]] as const) {
      add("P3-8", `glass·${name} vs 主栏`, TEXT, col(ctx, "main", token), surface(ctx, "main"))
      add("P3-8", `glass·${name} vs 侧栏`, TEXT, col(ctx, "sidebar", token), side)
    }
  }

  // P3-9 排队行上移 / 下移箭头（紧凑行底 = secondary/60 叠在主栏上）
  const turn = src("components/ai-chat/thread/turns/queued-user-turn.tsx")
  const [, iconTok, disabledOp] = pick(turn, /const iconClass =\s*"[^"]*rounded-md text-([\w-]+) [^"]*disabled:opacity-(\d+)"/, "排队箭头")
  const dock = stack(ctx, "main", surface(ctx, "main"), "background-secondary-default/60")
  const icon = col(ctx, "main", iconTok!)
  add("P3-9", "排队·上移/下移箭头", GRAPHIC, icon, dock)
  add("P3-9", `排队·箭头禁用态（opacity-${disabledOp}，WCAG 不要求，仅记录）`, null, over({ ...icon, a: Number(disabledOp) / 100 }, dock), dock)
  return out
}

type Row = { item: string; label: string; min: number | null; ctx: Ctx; ratio: number }
function allRows(): Row[] {
  return CONTEXTS.flatMap((ctx) => checks(ctx).map((c) => ({ item: c.item, label: c.label, min: c.min, ctx, ratio: contrast(c.fg, c.bg) })))
}

function report(rows: Row[]): string {
  const ids = THEME_ACCENTS.map((a) => a.id)
  const keys = [...new Set(rows.map((r) => `${r.item}|${r.label}`))].sort((a, b) => a.split("|")[0]!.localeCompare(b.split("|")[0]!))
  const lines = [`| 项 | 检查 | 门槛 | ${ids.join(" | ")} |`, `|---|---|---|${ids.map(() => "---").join("|")}|`]
  for (const key of keys) {
    const [item, label] = key.split("|")
    const rs = rows.filter((r) => `${r.item}|${r.label}` === key)
    const cells = ids.map((id) => {
      const mine = rs.filter((r) => r.ctx.accent.id === id)
      const worst = mine.reduce((a, b) => (b.ratio < a.ratio ? b : a))
      const where = `${worst.ctx.mode === "light" ? "亮" : "暗"}${worst.ctx.skin === "glass" ? "·glass" : ""}`
      const flag = worst.min !== null && worst.ratio < worst.min ? " ❌" : ""
      return `${worst.ratio.toFixed(2)}（${where}）${flag}`
    })
    lines.push(`| ${item} | ${label} | ${rs[0]!.min ?? "—"} | ${cells.join(" | ")} |`)
  }
  return lines.join("\n")
}

test("对比度报告（ACCENT_CONTRAST_REPORT=1 时打印，每格是该强调色在 亮/暗 × 经典/glass 里最差的一个）", () => {
  const rows = allRows()
  if (process.env.ACCENT_CONTRAST_REPORT) console.log(`\n${report(rows)}\n`)
  assert.ok(rows.length > CONTEXTS.length * 20)
})

test("P2 / P3：每种强调色 × 亮暗 × 经典 / glass 回退，字 ≥ 4.5、图形 ≥ 3、热力图相邻档 ≥ 1.15", () => {
  const bad = allRows()
    .filter((r) => r.min !== null && r.ratio < r.min)
    .map((r) => `${r.item} ${r.label} [${r.ctx.accent.id} ${r.ctx.mode} ${r.ctx.skin}] = ${r.ratio.toFixed(2)} < ${r.min}`)
  assert.deepEqual(bad, [])
})

test("P2-1：白字落在实心强调色上只能用 700 及更深（hover 800+），源码扫描", () => {
  const shades = whiteOnAccentShades()
  assert.ok(shades.size > 0, "扫到了白字按钮")
  for (const [key, where] of shades) {
    const n = Number(/(\d+)$/.exec(key)![1])
    assert.ok(n >= (key.startsWith("hover:") ? 800 : 700), `${key} 上放白字：${[...where].join(", ")}`)
  }
})

test("P3-8：glass 亮色的次级字 / 三级字 / 占位符 / 次级图标是中性灰（OKLCH 色度 < 0.01），不再掺强调色", () => {
  for (const ctx of CONTEXTS.filter((c) => c.skin === "glass" && c.mode === "light")) {
    for (const token of ["text-secondary", "text-tertiary", "text-placeholder", "foreground-icon-secondary", "foreground-icon-tertiary"]) {
      const [, chroma] = rgbToOklch(col(ctx, "main", token))
      assert.ok(chroma < 0.01, `${ctx.accent.id} glass ${token} 色度 ${chroma.toFixed(3)}`)
    }
  }
})

test("glass 无 GPU 回退的底色还是测试里假设的那几个（改了要同步 surface()）", () => {
  const flat = globalsCss.replace(/\s+/g, " ")
  assert.match(flat, /html:not\(\[data-gpu-compositing="on"\]\) main \{ background-color: #ffffff !important; \}/)
  assert.match(flat, /html:not\(\[data-gpu-compositing="on"\]\) aside\.rounded-3xl \{ background-color: #fafafa !important; \}/)
  assert.match(flat, /html\.dark:not\(\[data-gpu-compositing="on"\]\) aside\.rounded-3xl \{ background-color: #1c1c1c !important; \}/)
  assert.match(flat, /html\.dark:not\(\[data-gpu-compositing="on"\]\) \[data-shell-canvas\] \{ background-color: var\(--color-neutral-900\) !important; \}/)
  assert.match(src("components/settings/settings-side-drawer.tsx"), /<aside[\s\S]*?rounded-3xl/)
})

test("css-contrast 自检：oklch → sRGB 与 Tailwind 官方 hex 一致；WCAG 公式", () => {
  const s = scope(CONTEXTS[0]!, "main")
  const hex = (t: string) => {
    const c = resolveColor(`var(--color-${t})`, s)
    return "#" + [c.r, c.g, c.b].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("")
  }
  assert.equal(hex("amber-800"), "#973c00")
  assert.equal(hex("emerald-400"), "#00d492")
  assert.equal(hex("violet-800"), "#5d0ec0")
  assert.equal(hex("neutral-500"), "#737373")
  assert.equal(hex("blue-400"), "#3392ff", "theme.css 的覆盖生效")
  assert.equal(contrast(WHITE, { r: 0, g: 0, b: 0, a: 1 }).toFixed(1), "21.0")
  assert.equal(contrast(WHITE, resolveColor("#d97706", s)).toFixed(2), "3.19", "luna 量的琥珀 600")
})
