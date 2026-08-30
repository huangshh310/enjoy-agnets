# Design System: Enjoy Agents

Local-first Agent IDE. Screens are tools, not marketing. The first paint is always the workspace: a floating agent rail, a chat thread with a pill composer, and a resizable Changes/code pane. Stitch must generate **application chrome**, never landing-page heroes.

Atmosphere scores for this product: **Density 6** (Daily App Balanced, leaning cockpit when the code pane is open), **Variance 5** (Offset Asymmetric splits — never a centered canvas), **Motion 6** (Fluid CSS + spring physics; perpetual micro-loops only on live agent state).

---

## 1. Visual Theme & Atmosphere

A quiet architecture-studio desk: pale canvas, a floating grey rail on the left, two white work surfaces in the middle and right. The atmosphere is clinical yet warm — like a well-lit editing bay, not a terminal dungeon and not a SaaS marketing site.

Surfaces sit *on* the canvas rather than tiling it. Three floating cards, 12px inset from the window, 12px gap between cards (`gap-3`):

1. **Agent rail** — 260px (60px when collapsed), `rounded-3xl` / 24px, Mist fill, `shadow-sidebar`, 1px white edge.
2. **Chat stage** — flex, white, 24px radius, `shadow-card`.
3. **Changes pane** — resizable, white, 24px radius, `shadow-card`.

The window itself is the canvas (`background/full` = Mist `#F7F7F7` in light, Off-Black `#121212` in dark). White cards on mist are how 24px corners stay visible in light mode. Do not fuse chat and Changes into one white rectangle.

Hierarchy is whispered: elevation over color, weight over size. Selected session rows use a tertiary fill, not a neon pill. The only loud object in the chrome is the primary send button — a 32px accent-gradient disc.

Live agent work is the only place motion is allowed to persist: composer rim light, thinking indicator, tree-guide draw. Idle chrome is still.

**Signature:** the **pill composer** — a 28px-radius tertiary trough with a raised white plus chip on the left and a 32px accent send disc on the right. It is the product's verb. Every agent screen must include it, never a rectangular textarea.

---

## 2. Implementation stack (how we build, not how it looks)

Visual language is BoardUI. Runtime components are **not** BoardUI primitives.

| Layer | Source | Owns |
|---|---|---|
| Tokens, type scale, radii, shadows, dark class | BoardUI (`packages/ui/styles/`) | Look. `text-text-*`, `bg-background-*`, `accent-500`, `rounded-3xl`, `shadow-sidebar`. |
| App primitives | [shadcn/ui](https://ui.shadcn.com/) in `packages/ui/components/ui/` | Button, Input, Dialog, Dropdown, Tabs, Avatar, Select, Tooltip, … |
| Agent chrome | [AI Elements](https://elements.ai-sdk.dev/) in `packages/ui/components/ai-elements/` | Conversation, Message, PromptInput, Reasoning, Tool, CodeBlock. |
| Unique keepers | BoardUI application blocks | **ThemeToggle** (click-origin circular reveal) and **ComposerLoader** (iridescent rim). Do not replace these with generic toggles or spinners. |
| Product screens | `apps/desktop/.../ai-chat/` | Shell, sidebar tree, workspace wiring. Compose the layers above. |

shadcn CSS names (`bg-background`, `text-foreground`, `bg-primary`) are **aliases** of BoardUI tokens. Never introduce a second palette. After installing a shadcn or AI Elements file, restyle it to this document before using it on a screen.

**Do not** keep installing BoardUI `components/base/*` for new UI. Existing BoardUI base files stay only until their call sites have moved to `@/components/ui/*`.

Icons in product chrome: `@remixicon/react` component references. Lucide may appear inside installed shadcn/AI Elements files; swap to Remixicon when restyling a control that shows in the IDE chrome.

Class merge: `cx()` from `@/utils/cx` or `cn()` from `@/lib/utils` (same merge, `cn` is the shadcn entry).

---

## 3. Component sourcing (before writing anything)

When a feature needs a control, **search these registries first**, copy the interaction, then restyle to BoardUI tokens. Do not ship their default skins.

**Always first**

1. [shadcn/ui](https://ui.shadcn.com/) — dialogs, menus, tabs, inputs, command, sheet, resizable.
2. [AI Elements](https://elements.ai-sdk.dev/) — chat thread, messages, prompt, reasoning, tools, code, attachments.

**Then, by job**

| Need | Look here |
|---|---|
| Agent / chat / tool chips / streaming logs | [Beautiful UI](https://www.beautifului.dev/), [BeUI](https://beui.dev/) |
| Unusual but production-grade primitives | [Rare UI](https://www.rareui.com/components) |
| GPU / shader / WebGL surfaces | [vgpu.sh](https://vgpu.sh/), [ThreeUI](https://threeui.com/browse) |
| Layout systems, editorial density | [Fluid Functionalism](https://www.fluidfunctionalism.com/) |
| Community blocks, menus, marketing-grade motion | [21st.dev](https://21st.dev/) |
| Motion primitives (spring, morph, ticker) | [Motion Primitives](https://motion-primitives.com/docs) |

Install path:

```text
pnpm dlx shadcn@latest add <name>                 # from packages/ui or apps/desktop
pnpm dlx shadcn@latest add @ai-elements/<name>
```

Then: replace raw palette / `text-sm` with BoardUI tokens and composite type; keep the behavior. Product code imports from `@/components/ui/*` or `@/components/ai-elements/*`, never from a URL and never a one-off lookalike of a registry item we could have installed.

---

## 4. Color Palette & Roles

One cool-neutral family (Zinc/Neutral). No warm/cool gray mixing. Maximum one accent. Never pure black.

### Light (default)

- **Mist Canvas** (#F7F7F7) — Window ground (`background/full`). White 24px cards sit on this so corners read.
- **Paper Stage** (#FFFFFF) — Chat and Changes fills (`background/primary/default`). Dropdowns live here.
- **Mist Rail** (#F7F7F7) — Floating sidebar fill (`background/secondary/default`). Same as canvas; the rail still reads via `shadow-sidebar` + 1px white edge.
- **Pebble Fill** (#EBEBEB) — Composer trough, selected session row, tertiary chips (`background/tertiary/default`). Also default hairline (`border/button/default`, `separator/border`).
- **Charcoal Ink** (#0A0A0A) — Primary text and primary icons. Zinc-950 depth. Never `#000000`.
- **Muted Steel** (#737373) — Secondary text, nav labels, timestamps, idle icons (`text/secondary`, `foreground/icon/secondary`).
- **Whisper Label** (#A3A3A3) — Tertiary text, placeholders, status-bar metadata (`text/tertiary`, `text/placeholder`).
- **Whisper Border** (#EBEBEB) — 1px structural lines, code-snippet frames, dropdown edges.
- **Signal Blue** (#3392FF) — **The single accent.** CTAs, send disc, focus rings, selected pill tabs. Saturation stays below 80%. No purple, no neon glow.
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

Stitch, shadcn restyles, and product code speak in **semantic names**, not raw greys: `text/primary`, `background/secondary/default`, `border/button/default`, `foreground/icon/secondary`, `accent-500`. One accent ramp. Content blues for charts may use `blue-*`; interactive chrome must use `accent-*`.

shadcn aliases (do not restyle these to a second look): `background` → canvas, `card` / `popover` → paper, `primary` → Signal Blue, `muted` → mist, `destructive` → error coral, `ring` → focus ring. shadcn's bare `accent` token is the **hover fill**, not Signal Blue — Signal Blue is `accent-500` / `primary`.

---

## 5. Typography Rules

This is a **software UI / dashboard**. Serif is banned. Numbers in the Changes pane, diffs, and context meter are monospace.

The implemented face is **Inter Variable** (BoardUI default) plus **JetBrains Mono**. Do not switch to Geist in the running app unless we change the font load in one place. Stitch mockups may still use Geist; implementation follows Inter.

- **Display / UI:** Inter — track-tight, weight-driven hierarchy (Medium 500 / Semibold 600). Window chrome never goes above Title 3 (18/26).
- **Body:** Inter — 14/20 Medium for nav, chat, and composer (`text-body-medium`). Body 2 (13/18) for dense secondary lines. Max ~65 characters on assistant prose.
- **Mono:** JetBrains Mono — 13/24 for code snippets, Changes pane, diffs, tool args. Tabular numerals for line numbers and `+N / -N`.
- **Composite styles only** (never rebuild with `text-sm font-medium`):
  - `text-title-3-semibold` — settings titles, rare in-app headlines (18/26, weight 600)
  - `text-headline-medium` — 16/22 section labels if needed
  - `text-body-medium` — default UI (14/20, weight 500)
  - `text-body-regular` — secondary supporting copy (14/20, weight 400)
  - `text-caption-1-medium` — timestamps, status bar, file paths (12/16)
  - `text-caption-1-semibold` — kbd, New badge, language chip
- **Banned:** generic system UI as the *designed* face, any serif. No gradient text on headers.

---

## 6. First Impression (Agent Workspace, not a Hero)

There is **no marketing hero**. Do not generate a centered headline, inline-photo typography, or a single CTA over a full-bleed image. The first impression is the **three floating cards**:

1. **Agent rail (left, 260px, collapsing to 60px)** — avatar + name, Quick Search pill with `⌘L`, New agent / Open folder / Automations / Customize, Repositories tree with curved connectors and relative-time chips, theme segmented control, Support / Settings, workspace card + Folder. Collapsed: icon rail, collapse control above the avatar, 36px centered items.
2. **Chat stage (flex, own white card)** — breadcrumb (`workspace > session`), user bubble (right, pebble fill, 16px radius), assistant prose (left, ink on paper), bordered code snippet card, quiet icon actions, pill composer, status bar (`Main` · project · `∞ Agent` · context ring).
3. **Changes pane (right, own white card, resizable, min 280px, default ~38%)** — blue PillTab `Changes | Browser`, uncommitted summary with `+N -N`, file row with sparkle + New badge, line-numbered source.

Asymmetry is mandatory: rail is a separate floating object; chat is wider than Changes; user bubbles hug the right, assistant blocks hug the left. **Centered layouts are banned.** Maximum one primary CTA on a given surface (send disc *or* Folder, not both competing in the same visual zone). No “Scroll to explore”, no bouncing chevrons.

The split between chat and Changes is a **gap in the canvas** (12px hit area), not a hairline drawn on a shared white card.

**Settings is a route, not a modal.** Hash URL `#/settings/general` (and `#/settings/providers`, etc.). Layout matches desktop AI IDEs (Codex / Cursor): a mist nav column with Back to app + search + grouped rows, and a white `rounded-3xl` content card. Settings rows live in bordered inner cards (title, description, control on the right). `Ctrl+,` opens General; Escape returns to the workspace.

**Automations and Customize are the same kind of route.** `#/automations` is the job list (create / enable / delete). `#/customize/instructions` covers always-on notes; Skills and Rules are later loaders for `.agents/skills` and project rules. Sidebar items must navigate, never no-op buttons. Escape returns to the workspace from any of these pages.

---

## 7. Component Stylings

### Buttons (shadcn `Button`, BoardUI skin)

- **Primary / default:** 180° fill from Signal Blue (#3392FF) to Accent Press (#2563EB). White label. 10px radius (`rounded-2lg`) for rectangular; **full circle** for icon-only send. Inner top highlight allowed (`shadow-nav-selected`). Tactile press: translateY(1px) on active. No outer glow.
- **Secondary / outline:** white fill, 1px `border/button/default`, `shadow-xs`. Hover darkens border.
- **Ghost / quiet icon:** no border, no fill at rest. 32px hit target, 16px glyph, `foreground/icon/secondary`. Hover: `background/secondary/hover`. Used for thumbs, copy, more, share.
- **Xs primary:** 24px height, 4px radius, caption semibold — the only small primary in the rail footer.
- Disabled: washed neutral, no shadow. Never grey-on-grey that fails contrast.
- Map: BoardUI `primary` → shadcn `default`; `secondary` → `outline`; `ghost` → `ghost`; `danger` → `destructive`. Sizes: medium → `default` (h-9), small → `sm` (h-8), xs → `xs` (h-6).

### Cards & panes

- Floating rail, chat, and Changes: **24px radius**. Rail: `shadow-sidebar`. Chat and Changes: `shadow-card`.
- Code snippet in chat: 16px radius, 1px whisper border, header row with language chip + filename + `+N -N` + quiet copy.
- Use cards only when elevation states hierarchy. Inside the Changes list, rows are fills — not nested cards.
- High-density logs: border-left tree guide or divider, not stacked cards.

### Composer (signature — PromptInput restyled, wrapped in ComposerLoader)

- Outer: 28px-radius pebble trough, 6px inner padding.
- Plus chip: 32px white circle, `shadow-xs`, sits *on* the trough (raised, not a hole).
- Field: transparent, `text-body-medium`, placeholder `text/tertiary` (“Ask me anything”).
- Model picker: ghost text + chevron, no field chrome.
- Mic: quiet icon.
- Send: 32px Signal Blue disc with up-arrow. Disabled at 40% opacity when empty.
- While the agent runs: ComposerLoader iridescent rim (teal → sky → pink → mint) orbits the pill; thinking indicator appears above. Do not use a circular spinner.

### Inputs / search

- Quick Search: full-width 36px pill, pebble/tertiary fill, 20px search glyph, trailing `Kbd` (`⌘L`). No floating labels. Label-above only on settings forms. Error text below.
- Focus ring: 2px Signal Blue (`border/focus-ring` / `ring-ring`).

### Tabs

- Changes / Browser: **PillTab, blue variant** — fully rounded, selected thumb `accent-50` with `accent-500` icon+label. Not underline tabs. Prefer restyling shadcn Tabs to this thumb; the BoardUI `PillTab` block may remain until that restyle lands.

### Navigation rows

- 8px padding, 10px radius, 20px Remix icons, `text-body-medium`.
- Selected session: tertiary fill, not accent wash (accent is reserved for send / Folder / focus).
- Repository children indent ~26px with a 1px whisper **curved tree guide** (vertical then 6px radius elbow into the row). Last child has no hanging tail.

### Avatars

- 32px (`md`) in the rail, 20px (`xs`) in menus. Initials on tinted discs. Never generic stock faces.

### Loaders

- Agent: AI Elements Reasoning and/or BoardUI `AgentThinking` (wave / spin / stars / infinity) + elapsed timer. Composer: ComposerLoader orbiting rim.
- Skeletal shimmers matching layout boxes for file trees and message lists.
- **Banned:** generic circular spinners, Monaco “Loading…” voids.

### Empty / error

- Empty thread: composed prompt into the composer, no illustration mascot, no emoji.
- Approval: inline bordered panel with tool name + args, Allow / Deny. Never a blocking modal for routine tool approvals. AI Elements `Tool` may host this once restyled.
- Errors: `text/error/primary` inline under the thread or field.

### Code

- Line numbers tabular, tertiary color, 13px JetBrains Mono.
- Keywords in a restrained violet, strings in success moss, comments tertiary. No rainbow syntax. No fake highlighting of prose.

---

## 8. Layout Principles

- **Canvas + three floating objects.** Window padding 12px. Rail 260px / 60px. Chat and Changes fill the rest as two cards with a 12px canvas gap. No full-bleed sidebars glued to the window edge.
- **Split the stage across cards, not inside one card.** Drag handle is a 12px hit area over the canvas; hover/active may tint a hairline Signal Blue. Persist widths. Chat min 360px, Changes min 280px. Default about 62 / 38.
- **CSS Grid / flex with named regions.** No overlapping, no absolute-positioned content stacking except the tree guide and the split-handle pseudo-line.
- **No 3-equal-card feature rows.** Agent surfaces are lists, trees, and splits. The three cards are unequal on purpose.
- Full-height app shell uses `min-h-[100dvh]` / `h-full` from the Electron root — never `h-screen`.
- Status bar is a caption row under the composer, not a OS-style footer bar with a border.

---

## 9. Responsive Rules

This is a **desktop-first Electron IDE**. Below 1100px window width, keep the rail and collapse Changes rather than stacking marketing-style sections.

- **< 1100px:** Changes pane may collapse to a tab; chat keeps the composer. Do not shrink the send disc below 32px.
- **< 768px (if ever shown):** rail becomes a 60px icon rail or a drawer; repositories hide labels; Quick Search becomes a 36px circle. Single column. No horizontal scroll.
- Touch / click targets: 36px for rail items and composer chips, 32px minimum elsewhere (44px if a future touch shell).
- Typography does not scale down body below 14px / `text-body-*`. Captions stay 12px.
- Theme toggle stays in the rail footer; never jump into a hamburger.

---

## 10. Motion & Interaction

- **Spring default:** `stiffness: 100, damping: 20` — weighty, not snappy-linear. PillTab thumb uses a short overshoot cubic (`cubic-bezier(0.34, 1.2, 0.64, 1)`, 300ms).
- **Theme toggle:** click-origin circular reveal (~820ms, `cubic-bezier(0.16, 1, 0.3, 1)`). Freeze color transitions while the circle expands. Persist `boardui:theme` on `localStorage`. Do not follow OS theme.
- **Perpetual loops only on live work:** composer orbit (4.5s/lap), thinking shimmer, context-ring is static. Idle icons do not bounce.
- **Stagger:** repository children and streaming log rows blur-in (6px blur, 4px lift, 0.42s). Tree guide draws as one pen (~160px/s, linear) so elbows do not fork in time.
- **Buttons:** 1px downward press on active. No custom cursors except `col-resize` on the split handle.
- Animate `transform` and `opacity` only. Grain/noise if used at all sits on a fixed pseudo-element of the canvas, never on scrolling content.
- Motion Primitives / 21st.dev motion is allowed only when it serves a real state change (open, stream, approve). Do not add decorative loops to idle chrome.

---

## 11. Anti-Patterns (Banned)

- No emojis anywhere in chrome, empty states, or copy.
- No generic serifs. No gradient text on headers.
- No pure black (`#000000`). Use Off-Black / Charcoal Ink.
- No neon outer glows, no purple/blue neon gradients, no oversaturated accents.
- No custom mouse cursors (split handle excepted).
- No overlapping content; every element owns a spatial zone.
- No 3-column equal card rows. No centered marketing heroes.
- No generic names (“John Doe”, “Acme”, “Nexus”). Session titles come from real work.
- No fake round metrics (`99.99%`, `50%`). Context meter may show a real usage percent; if unknown, use a placeholder label, not a made-up number.
- No `LABEL // YEAR` typography (“SYSTEM // 2024”).
- No AI copy clichés (“Elevate”, “Seamless”, “Unleash”, “Next-Gen”).
- No filler UI (“Scroll to explore”, “Swipe down”, bouncing chevrons).
- No broken Unsplash. Avatars are initials or local assets.
- No circular spinners. No Monaco CDN “Loading…” holes — code panes are local, line-numbered views.
- No bordered quiet actions (thumbs/copy must be borderless).
- No second accent color. No mixing warm stone greys with cool zinc.
- No API keys, secrets, or model endpoints rendered in the UI chrome.
- No shipping an OSS block in its default shadcn-gray / 21st-neon skin.
- No installing BoardUI `base` primitives for new work. No hand-rolling a Dialog/Select/Message that shadcn or AI Elements already ships.

---

## 12. Stitch / agent generation notes

When asking Stitch or an agent for a new screen, describe it in this vocabulary:

> Mist canvas. Three floating 24px-radius cards, 12px inset, 12px gaps. Left: 260px Mist Rail, sidebar elevation. Middle: white chat card — breadcrumb, thread, pebble pill composer with white plus chip and Signal Blue send disc, caption status bar. Right: white Changes card, blue PillTabs, JetBrains Mono source. Inter UI, JetBrains Mono code. Quiet icon buttons. Density 6, asymmetric split, one accent only. Implement with shadcn/ui + AI Elements restyled to these tokens.

Do not ask Stitch for a landing page, a 3-card feature row, or a centered hero with inline images. Those are a different product.
