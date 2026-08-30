# Design System: Enjoy Agents

Local-first Agent IDE. Screens are tools, not marketing. The first paint is always the workspace: a floating agent rail, a chat thread with a pill composer, and a resizable Changes/code pane. Stitch must generate **application chrome**, never landing-page heroes.

Atmosphere scores for this product: **Density 6** (Daily App Balanced, leaning cockpit when the code pane is open), **Variance 5** (Offset Asymmetric splits — never a centered canvas), **Motion 6** (Fluid CSS + spring physics; perpetual micro-loops only on live agent state).

---

## 1. Visual Theme & Atmosphere

A quiet architecture-studio desk: pale canvas, a floating grey rail on the left, one large white work surface in the middle. The atmosphere is clinical yet warm — like a well-lit editing bay, not a terminal dungeon and not a SaaS marketing site.

Surfaces sit *on* the canvas rather than tiling it. The agent sidebar is a 260px floating card (`rounded-3xl` / 24px, `shadow-sidebar`) with a 12px inset from the window edge. The main stage is a matching 24px-radius white card that holds chat + Changes. Gap between rail and stage is 12px (`gap-3`). The window itself is the canvas (`background/full`).

Hierarchy is whispered: elevation over color, weight over size. Selected session rows use a tertiary fill, not a neon pill. The only loud object in the chrome is the primary send button — a 32px accent-gradient disc.

Live agent work is the only place motion is allowed to persist: composer rim light, thinking indicator, tree-guide draw. Idle chrome is still.

**Signature:** the **pill composer** — a 28px-radius tertiary trough with a raised white plus chip on the left and a 32px accent send disc on the right. It is the product's verb. Every agent screen must include it, never a rectangular textarea.

---

## 2. Color Palette & Roles

One cool-neutral family (Zinc/Neutral). No warm/cool gray mixing. Maximum one accent. Never pure black.

### Light (default)

- **Canvas White** (#FFFFFF) — Window ground (`background/full`) and primary work-surface fill (`background/primary/default`). The chat stage and dropdowns live here.
- **Mist Rail** (#F7F7F7) — Floating sidebar fill (`background/secondary/default`). Also hover on primary surfaces.
- **Pebble Fill** (#EBEBEB) — Composer trough, selected session row, tertiary chips (`background/tertiary/default`). Also default hairline (`border/button/default`, `separator/border`).
- **Charcoal Ink** (#0A0A0A) — Primary text and primary icons. Zinc-950 depth. Never `#000000`.
- **Muted Steel** (#737373) — Secondary text, nav labels, timestamps, idle icons (`text/secondary`, `foreground/icon/secondary`).
- **Whisper Label** (#A3A3A3) — Tertiary text, placeholders, status-bar metadata (`text/tertiary`, `text/placeholder`).
- **Whisper Border** (#EBEBEB) — 1px structural lines, code-snippet frames, dropdown edges.
- **Signal Blue** (#3392FF) — **The single accent.** CTAs, send disc, focus rings, selected pill tabs, Upgrade. Saturation stays below 80%. No purple, no neon glow.
- **Accent Press** (#2563EB) — Active/pressed end of the primary 180° gradient (`accent-600`).
- **Success Moss** (#3F6212 on #D9F99D) — Diff additions, `+N` chips (`state/success`).
- **Error Coral** (#EF4444) — Diff deletions, inline errors, danger actions (`text/error/primary`).

### Dark (`.dark` on `<html>`)

- **Off-Black Canvas** (#121212) — `background/full`. Never `#000000`.
- **Graphite Stage** (#262626) — Primary work surface (`neutral-800`).
- **Rail Night** (#171717) — Sidebar (`neutral-900`).
- **Snow Ink** (#FAFAFA) — Primary text.
- Same **Signal Blue** accent. Tokens flip; do not hand-author `dark:` palette classes.

### Token law

Stitch and implementation speak in **semantic names**, not raw greys: `text/primary`, `background/secondary/default`, `border/button/default`, `foreground/icon/secondary`, `accent-500`. One accent ramp. Content blues for charts may use `blue-*`; interactive chrome must use `accent-*`.

---

## 3. Typography Rules

This is a **software UI / dashboard**. Serif is banned. Numbers in the Changes pane, diffs, and context meter are monospace.

- **Display / UI:** Geist — track-tight, weight-driven hierarchy (Medium 500 / Semibold 600). No screaming display sizes in the IDE. Window chrome never goes above Title 3 (18/26).
- **Body:** Geist — 14/20 Medium for nav, chat, and composer (`text-body-medium`). Body 2 (13/18) for dense secondary lines. Max ~65 characters on assistant prose.
- **Mono:** JetBrains Mono — 13/24 for code snippets, Changes pane, diffs, tool args. Tabular numerals for line numbers and `+N / -N`.
- **Composite styles only** (never rebuild with `text-sm font-medium`):
  - `text-title-3-semibold` — settings titles, rare in-app headlines (18/26, weight 600)
  - `text-headline-medium` — 16/22 section labels if needed
  - `text-body-medium` — default UI (14/20, weight 500)
  - `text-body-regular` — secondary supporting copy (14/20, weight 400)
  - `text-caption-1-medium` — timestamps, status bar, file paths (12/16)
  - `text-caption-1-semibold` — kbd, New badge, language chip
- **Banned:** Inter, generic system UI fonts as the *designed* face, any serif (`Times`, `Georgia`, `Garamond`, `Palatino`, even distinctive serifs — this is an IDE). No gradient text on headers.

---

## 4. First Impression (Agent Workspace, not a Hero)

There is **no marketing hero**. Do not generate a centered headline, inline-photo typography, or a single CTA over a full-bleed image. The first impression is the **three-zone workspace**:

1. **Agent rail (left, 260px, floating)** — avatar + name, Quick Search pill with `⌘L`, New agent / Automations / Customize, Repositories tree with curved connectors and relative-time chips, theme segmented control, Support / Settings, Board team + Upgrade.
2. **Chat stage (flex)** — breadcrumb (`workspace > session`), user bubble (right, pebble fill, 16px radius), assistant prose (left, ink on white), bordered code snippet card, quiet icon actions (no chrome buttons), pill composer, status bar (`Main` · project · `∞ Agent` · context ring).
3. **Changes pane (right, resizable, min 280px, default ~38%)** — blue PillTab `Changes | Browser`, uncommitted summary with `+N -N`, file row with sparkle + New badge, line-numbered source.

Asymmetry is mandatory: rail is a separate floating object; chat is wider than code; user bubbles hug the right, assistant blocks hug the left. **Centered layouts are banned.** Maximum one primary CTA on a given surface (send disc *or* Upgrade, not both competing in the same visual zone). No “Scroll to explore”, no bouncing chevrons.

---

## 5. Component Stylings

### Buttons

- **Primary:** 180° fill from Signal Blue (#3392FF) to Accent Press (#2563EB). White label. 10px radius (`rounded-2lg`) for rectangular; **full circle** for icon-only send. Inner top highlight allowed (`shadow-nav-selected`). Tactile press: translateY(1px) on active. No outer glow.
- **Secondary:** white fill, 1px `border/button/default`, `shadow-xs`. Hover darkens border to `#D4D4D4`.
- **Ghost / quiet icon:** no border, no fill at rest. 32px hit target, 16px glyph, `foreground/icon/secondary`. Hover: `background/secondary/hover`. Used for thumbs, copy, more, share.
- **Xs Upgrade:** 24px height, 4px radius, caption semibold — the only small primary in the rail footer.
- Disabled: washed neutral gradient, no shadow. Never grey-on-grey that fails contrast.

### Cards & panes

- Floating rail and main stage: **24px radius**, 1px white/whisper edge, `shadow-sidebar` on the rail, `shadow-card` on the stage.
- Code snippet in chat: 16px radius, 1px whisper border, header row with language chip + filename + `+N -N` + quiet copy.
- Use cards only when elevation states hierarchy. Inside the Changes list, rows are fills — not nested cards.
- High-density logs: border-left tree guide or divider, not stacked cards.

### Composer (signature)

- Outer: 28px-radius pebble trough, 6px inner padding.
- Plus chip: 32px white circle, `shadow-xs`, sits *on* the trough (raised, not a hole).
- Field: transparent, `text-body-medium`, placeholder `text/tertiary` (“Ask me anything”).
- Model picker: ghost text + chevron, no field chrome.
- Mic: quiet icon.
- Send: 32px Signal Blue disc with up-arrow. Disabled at 40% opacity when empty.
- While the agent runs: iridescent rim band (teal → sky → pink → mint) orbits the pill; thinking indicator appears above. Do not use a circular spinner.

### Inputs / search

- Quick Search: full-width 36px pill, pebble/tertiary fill, 20px search glyph, trailing `Kbd` (`⌘L`). No floating labels. Label-above only on settings forms. Error text below.
- Focus ring: 2px Signal Blue (`border/focus-ring`).

### Tabs

- Changes / Browser: **PillTab, blue variant** — fully rounded, selected thumb `accent-50` with `accent-500` icon+label. Not underline tabs.

### Navigation rows

- 8px padding, 10px radius, 20px Remix icons, `text-body-medium`.
- Selected session: tertiary fill, not accent wash (accent is reserved for send / Upgrade / focus).
- Repository children indent ~26px with a 1px whisper **curved tree guide** (vertical then 6px radius elbow into the row). Last child has no hanging tail.

### Avatars

- 32px (`md`) in the rail, 20px (`xs`) in menus. Initials on tinted discs (`neutral` / `blue` / `lime` / `pink`). Never generic stock faces.

### Loaders

- Agent: `AgentThinking` (wave / spin / stars / infinity) + elapsed timer. Composer: orbiting rim light.
- Skeletal shimmers matching layout boxes for file trees and message lists.
- **Banned:** generic circular spinners, Monaco “Loading…” voids.

### Empty / error

- Empty thread: composed prompt into the composer, no illustration mascot, no emoji.
- Approval: inline bordered panel with tool name + args, Allow / Deny. Never a blocking modal for routine tool approvals.
- Errors: `text/error/primary` inline under the thread or field.

### Code

- Line numbers tabular, tertiary color, 13px JetBrains Mono.
- Keywords in `docs/command-accent` (restrained violet), strings in success moss, comments tertiary. No rainbow syntax. No fake highlighting of prose.

---

## 6. Layout Principles

- **Canvas + floating objects.** Window padding 12px. Rail 260px. Stage fills the rest. No full-bleed sidebars glued to the window edge.
- **Split the stage, not the window.** Chat | Changes is an internal split of the white card. Drag handle is a 12px hit area over a 1px separator; hover/active tints the hairline Signal Blue. Persist widths. Chat min 360px, Changes min 280px. Default about 62 / 38.
- **CSS Grid / flex with named regions.** No `calc()` percentage hacks. No overlapping, no absolute-positioned content stacking except the tree guide and the split-handle pseudo-line.
- **No 3-equal-card feature rows.** Agent surfaces are lists, trees, and splits.
- Full-height app shell uses `min-h-[100dvh]` / `h-full` from the Electron root — never `h-screen`.
- Status bar is a caption row under the composer, not a OS-style footer bar with a border.

---

## 7. Responsive Rules

This is a **desktop-first Electron IDE**. Below 1100px window width, keep the rail and collapse Changes rather than stacking marketing-style sections.

- **< 1100px:** Changes pane may collapse to a tab; chat keeps the composer. Do not shrink the send disc below 32px.
- **< 768px (if ever shown):** rail becomes a 60px icon rail or a drawer; repositories hide labels; Quick Search becomes a 36px circle. Single column. No horizontal scroll.
- Touch / click targets: 36px for rail items and composer chips, 32px minimum elsewhere (44px if a future touch shell).
- Typography does not scale down body below 14px / `text-body-*`. Captions stay 12px.
- Theme toggle stays in the rail footer; never jump into a hamburger.

---

## 8. Motion & Interaction

- **Spring default:** `stiffness: 100, damping: 20` — weighty, not snappy-linear. PillTab thumb uses a short overshoot cubic (`cubic-bezier(0.34, 1.2, 0.64, 1)`, 300ms).
- **Theme toggle:** click-origin circular reveal (~820ms, `cubic-bezier(0.16, 1, 0.3, 1)`). Freeze color transitions while the circle expands. Persist `boardui:theme` on `localStorage`. Do not follow OS theme.
- **Perpetual loops only on live work:** composer orbit (4.5s/lap), thinking shimmer, context-ring is static. Idle icons do not bounce.
- **Stagger:** repository children and streaming log rows blur-in (6px blur, 4px lift, 0.42s). Tree guide draws as one pen (~160px/s, linear) so elbows do not fork in time.
- **Buttons:** 1px downward press on active. No custom cursors except `col-resize` on the split handle.
- Animate `transform` and `opacity` only. Grain/noise if used at all sits on a fixed pseudo-element of the canvas, never on scrolling content.

---

## 9. Anti-Patterns (Banned)

- No emojis anywhere in chrome, empty states, or copy.
- No Inter as the *designed* UI face (Geist + JetBrains Mono). No generic serifs.
- No pure black (`#000000`). Use Off-Black / Charcoal Ink.
- No neon outer glows, no purple/blue neon gradients, no oversaturated accents.
- No gradient text on headers.
- No custom mouse cursors (split handle excepted).
- No overlapping content; every element owns a spatial zone.
- No 3-column equal card rows. No centered marketing heroes.
- No generic names (“John Doe”, “Acme”, “Nexus”). Session titles come from real work (“coding scenario”, “landing page design”).
- No fake round metrics (`99.99%`, `50%`). No invented uptime, latency, or “BY THE NUMBERS” dashboards. Context meter may show a real usage percent; if unknown, use a placeholder label, not a made-up number.
- No `LABEL // YEAR` typography (“SYSTEM // 2024”).
- No AI copy clichés (“Elevate”, “Seamless”, “Unleash”, “Next-Gen”).
- No filler UI (“Scroll to explore”, “Swipe down”, bouncing chevrons).
- No broken Unsplash. Avatars are initials or local assets.
- No circular spinners. No Monaco CDN “Loading…” holes — code panes are local, line-numbered views.
- No bordered quiet actions (thumbs/copy must be borderless).
- No second accent color. No mixing warm stone greys with cool zinc.
- No API keys, secrets, or model endpoints rendered in the UI chrome.

---

## 10. Stitch generation notes

When asking Stitch for a new screen, describe it in this vocabulary:

> Floating 260px Mist Rail on Canvas White, 12px inset, 24px radius, sidebar elevation. Main stage is a 24px-radius white card. Inside: breadcrumb header 48px, chat thread, pebble pill composer with white plus chip and Signal Blue send disc, caption status bar. Right: resizable Changes pane with blue PillTabs and JetBrains Mono source. Geist UI, JetBrains Mono code. Quiet icon buttons, no chrome on thumbs. Density 6, asymmetric split, one accent only.

Do not ask Stitch for a landing page, a 3-card feature row, or a centered hero with inline images. Those are a different product.
