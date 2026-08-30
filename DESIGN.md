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

**Signature:** the **BorderBeam card composer** — a 22px-radius frosted container with a colorful animated BorderBeam rim light on focus/active/running, containing an adaptive multi-line textarea, quick context chips, inline execution mode selector (Agent / Ask / Plan / Debug), multi-provider ModelPicker with Lobe brand icons, and Reasoning Energy Bar toggle.

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

Icons are two families — do not mix jobs:

| Job | Source | Rule |
|---|---|---|
| Product chrome (nav, actions, form chrome, status) | `@remixicon/react` | Pass as component references. Lucide may remain inside installed shadcn / AI Elements files; swap to Remixicon when restyling a control that shows in the IDE chrome. |
| AI / LLM brand marks (providers, models) | [`@lobehub/icons`](https://lobehub.com/zh/icons) | Official brand SVGs only. Prefer `.Color` when the icon exports it; otherwise the base mark. Use `ModelIcon` for a model ID string. Route product call sites through `ProviderIcon` / a model-icon helper — do not scatter raw brand imports. |

Never use a Remix generic cloud / plug / robot glyph as a stand-in for OpenAI, Claude, Gemini, DeepSeek, Qwen, etc. Custom / unknown endpoints fall back to `RiServerLine` or `RiPlugLine`.

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
| AI / LLM brand logos, model marks | [Lobe Icons](https://lobehub.com/zh/icons) — `@lobehub/icons`. Browse [lobehub.com/icons](https://lobehub.com/icons); component docs at [icons.lobehub.com](https://icons.lobehub.com). |

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

`SecondaryPageShell` content width is a named variant, never an ad-hoc max-width:

| Variant | Width | Use |
|---|---|---|
| `article` | `max-w-[760px]` | Prose / single-column forms (Customize). |
| `wide` | `max-w-5xl` | Settings, especially Providers — catalog grids must not clip at 760px. |
| `stage` | full column | Automations list / stage surfaces. |

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
- Model picker: `ModelPicker` popover trigger — leading AI brand icon (from `@lobehub/icons`, e.g. Grok/DeepSeek/Claude/OpenAI), truncated label, subtle chevron. Popover shows full model catalog grouped by provider, search filter, active provider tags, role badges (Fast / Thinking), and a quick link to manage providers.
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
- No 3-column equal **marketing** feature rows. No centered marketing heroes. Settings preset catalogs may use `lg:grid-cols-3` (see §14).
- No generic names (“John Doe”, “Acme”, “Nexus”). Session titles come from real work.
- No fake round metrics (`99.99%`, `50%`). Context meter may show a real usage percent; if unknown, use a placeholder label, not a made-up number.
- No `LABEL // YEAR` typography (“SYSTEM // 2024”).
- No AI copy clichés (“Elevate”, “Seamless”, “Unleash”, “Next-Gen”).
- No filler UI (“Scroll to explore”, “Swipe down”, bouncing chevrons).
- No broken Unsplash. Avatars are initials or local assets.
- No circular spinners. No Monaco CDN “Loading…” holes — code panes are local, line-numbered views.
- No bordered quiet actions (thumbs/copy must be borderless).
- No second accent color. No mixing warm stone greys with cool zinc.
- No API keys or secrets rendered in chrome. Configured-provider rows may show a truncated Base URL and `••••` last-4 key hint — never the raw key.
- No shipping an OSS block in its default shadcn-gray / 21st-neon skin.
- No installing BoardUI `base` primitives for new work. No hand-rolling a Dialog/Select/Message that shadcn or AI Elements already ships.
- No Remix / Lucide generic glyphs as AI brand marks. No hand-drawn OpenAI / Claude / Gemini SVGs. Use [Lobe Icons](https://lobehub.com/zh/icons).
- No brand-only provider catalog that hides protocol. Cards are presets over `openai` / `anthropic` / `openai-responses`, not exclusive vendor lock-in.
- No burying Custom Endpoint at the bottom of a long page. Custom / OpenAI `/v1` and Anthropic Messages sit in a top banner.
- No inline provider editor at the page footer. Add / edit opens a Dialog (`sm:max-w-xl`), tabbed, not a stacked form under the catalog.
- No raw API keys, full secrets, or live endpoints painted into list chrome. Show `••••` + last-4 hint only.

---

## 12. Stitch / agent generation notes

When asking Stitch or an agent for a new screen, describe it in this vocabulary:

> Mist canvas. Three floating 24px-radius cards, 12px inset, 12px gaps. Left: 260px Mist Rail, sidebar elevation. Middle: white chat card — breadcrumb, thread, pebble pill composer with white plus chip and Signal Blue send disc, caption status bar. Right: white Changes card, blue PillTabs, JetBrains Mono source. Inter UI, JetBrains Mono code. Quiet Remixicon actions. AI brand marks from Lobe Icons. Density 6, asymmetric split, one accent only. Implement with shadcn/ui + AI Elements restyled to these tokens.

For `#/settings/providers`:

> Wide settings card (`max-w-5xl`). Custom Endpoint banner first. Then configured profiles. Then a 3-column preset catalog with protocol filter. Edit in a tabbed Dialog (Connection / Models / Parameters / Overrides). Provider marks via `@lobehub/icons`. No page-bottom form.

Do not ask Stitch for a landing page, a 3-card feature row, or a centered hero with inline images. Those are a different product.

---

## 13. Icons — Remixicon vs Lobe Icons

Product chrome and AI brand marks are different jobs. Mixing them makes the IDE look generic.

### Remixicon — chrome only

Nav rows, composer chips, dialog actions, status glyphs, empty-state icons: `@remixicon/react` component references (`RiSearchLine`, `RiAddLine`, …). 16px in quiet actions, 20px in nav rows, 24px only when the mark is the row’s primary identity.

### Lobe Icons — AI / LLM brands

Package: `@lobehub/icons` (`^5.16.0` in the workspace catalog).

- Browse: [lobehub.com/zh/icons](https://lobehub.com/zh/icons) · [lobehub.com/icons](https://lobehub.com/icons)
- Components: [icons.lobehub.com](https://icons.lobehub.com)
- Source: [github.com/lobehub/lobe-icons](https://github.com/lobehub/lobe-icons)

Usage in product code:

```tsx
import { DeepSeek, OpenAI, ModelIcon } from "@lobehub/icons"

<DeepSeek.Color size={24} />   // hasColor — prefer this
<OpenAI size={24} />           // no .Color export — use the base mark
<ModelIcon model="gpt-4o" size={20} />
```

Helpers already in the app:

- `ProviderIcon` in `apps/desktop/.../settings/providers/provider-icons.tsx` — maps `ProviderKind` / `ApiStyle` to a Lobe mark. New call sites import this, they do not re-import brand components.
- `ModelIcon` from `@lobehub/icons` — when a **model ID** (not a provider kind) needs a mark in lists, comboboxes, or the composer picker.

Variant law (check `toc[].param` or the [icons site](https://lobehub.com/zh/icons) before assuming `.Color` exists):

| Export | When |
|---|---|
| `Icon.Color` | Preferred for catalog cards, configured rows, dialog headers. |
| Base `Icon` | OpenAI, Groq, Ollama, Anthropic — these often have no `.Color`. |
| `ModelIcon` | Model ID strings (`deepseek-chat`, `claude-sonnet-4-5`). |
| `ProviderIcon` (Lobe helper) | Only if we need a provider-key lookup outside our wrapper. |
| Remix `RiServerLine` / `RiPlugLine` | `kind === "custom"` or unknown protocol. |

Do not wrap brand marks in a second accent wash. Sit them on Paper / Mist in a 8–32px rounded tile (`rounded-xl`, 1px `border/button/default`). Active profile: the tile gets a Signal Blue hairline (`border-accent-500/40` + `ring-2 ring-accent-500/10`), not a floating green dot.

CDN / static PNG paths from Lobe are for docs and marketing only. The running app imports the React components so tree-shaking stays intact.

---

## 14. Providers settings (current interaction spec)

`#/settings/providers` is a **protocol factory** surface. The runtime is Vercel AI SDK 7 (`createOpenAI` / `createAnthropic` / `openai.responses`). Brand cards are presets that fill `kind`, `apiStyle`, `defaultBaseURL`, and a default model catalog — they are not exclusive vendors.

Wire APIs (the only protocols that matter):

| `apiStyle` | Wire | Typical path |
|---|---|---|
| `openai` | Chat Completions | `/v1/chat/completions` |
| `anthropic` | Messages | `/v1/messages` |
| `openai-responses` | Responses | `/v1/responses` |

### Page structure (Dual-view Segmented Architecture)

The page decouples daily management from preset browsing via **top Segmented View Tabs**:

1. **Top Bar**:
   - Title `Providers` & subtitle.
   - **Segmented Control**: `Configured (N)` (active provider dot, model count) and `Explore Presets (M)`.
   - Quick `+ Custom /v1` action.

2. **View A: `Configured` Tab**:
   - **Metrics & Filter Bar**: Total configured count, active provider badge, total models count across all profiles, **Test Speed (测速)** batch trigger, and quick real-time filter input.
   - **Configured Providers List**: Compact rows with 24px brand icon, active status pill, protocol badge (`OpenAI Chat Completions`, `Messages`, etc.), model count badge (`10 models`), **Speed Test button & multi-state latency badge** (green `<500ms`, yellow `<1500ms`, red `>1500ms`/error), model ID, endpoint, key hint, and `In use`/`Use`, `Edit`, `Delete` actions.
   - **Empty State**: Elegant onboarding guide with shortcuts to popular providers (`DeepSeek`, `OpenAI`, `Claude`) and Custom Endpoints when no providers exist.

3. **View B: `Explore Presets` Tab**:
   - **Custom Endpoint Banner**: Top banner with explicit `+ OpenAI /v1` and `+ Anthropic Messages` actions.
   - **Official Presets Bento Grid**: 3 columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`), protocol filter pills (`All`, `Chat Completions`, `Messages`, `Responses`), and search input. Each card features Lobe Icons, model preview, and `Configured` tag.

Settings uses `contentWidth="wide"` so the grid survives both the default Electron window and fullscreen. `article` (760px) is banned on this page.

### Editor — Dialog, not a page-bottom form

`ProviderEditorDialog`: `sm:max-w-xl`, `rounded-2xl`, header = Lobe mark + preset name + one-line description + API Docs link. Four tabs (shadcn Tabs, pebble trough, selected thumb is paper + `shadow-xs` — not underline, not Changes-pane PillTab):

| Tab | Owns |
|---|---|
| **Connection** | Display name, protocol / wire API, API key (OS keychain; renderer never re-reads plaintext), Base URL. |
| **Models** | Primary model (combobox + Fetch remote `/models`), reasoning model auto-detection & effort selector, optional Fast / Reasoning role IDs, editable provider catalog (fetched + preset + user-added). |
| **Parameters** | Context window (128K / 200K / 256K / 1M / 2M chips), reasoning effort (`low`…`xhigh`), max output tokens, temperature. |
| **Overrides** | Custom HTTP headers JSON, custom body JSON (Format + template chips), underlying preset reference. |

Save writes the vault via `settings.upsertProvider` and activates. Fetch / probe errors use `state/error` copy, not success-green. HTML-instead-of-JSON catalog responses surface as a readable endpoint error, not a raw parse dump.

### Model catalog & Reasoning Mode Selector

- Preset `models[]` is the offline default.
- Fetch merges remote discovery on top; user can add / remove IDs.
- **Model Catalog Chips**: Each model chip in the catalog displays its corresponding `ModelBrandIcon`, supports clicking to quickly set as Primary Model with an active badge, and provides a quick delete action.
- Combobox (`Command` + `Popover`) uses BoardUI tokens: `bg-background-primary-default`, `border-separator-border` on the search hairline. Both the trigger button and each dropdown list item render the model brand icon (`ModelBrandIcon`). No raw `bg-popover` black rules, no overlapping highlight boxes.
- **Inference Mode & Thinking Energy Bar (推理模式与思考能量条)**:
  - Models tab automatically detects reasoning models (`DeepSeek-R1`, `o1`, `o3`, `QwQ`, `reasoner`, `thinking`).
  - Features an interactive **Reasoning Energy Bar (`ReasoningEnergyBar`)** supporting drag & drop and click-to-select across 5 depth levels:
    - `Default` (Level 0): Sky blue gradient, native provider budget.
    - `Low` (Level 1): Emerald green gradient (`from-emerald-400 to-teal-500`), fast & concise thinking.
    - `Medium` (Level 2): Amber gold gradient (`from-amber-400 to-yellow-500`), balanced depth & speed.
    - `High` (Level 3): Warm orange-rose gradient (`from-orange-400 to-rose-500`), deep multi-step reasoning.
    - `Max` (Level 4): Vivid neon purple/fuchsia gradient (`from-purple-500 via-fuchsia-500 to-indigo-500`), exhaustive deep thinking.
  - Chat Composer features a dedicated `ReasoningEffortToggle` next to the Model Picker with a **Mini Energy Gauge (`MiniEnergyMeter`)** reflecting the active level and color aura, plus an integrated `ReasoningEnergyBar` directly in the popover dropdown for instant on-the-fly tuning.

### Overrides Tab Design

- **Code Block Editor Cards**: Custom HTTP Headers and Body Overrides are housed in dedicated code block cards with a structured header toolbar (title, explanation, quick template injection chips like `+ X-Title` / `+ OpenRouter Referer` / `+ top_p`, and a `Format` button).
- **Error Feedback**: Inline syntax validation displays readable error banners at the bottom of the code card.
- **Underlying Preset Reference**: Rich select dropdown with brand icon previews and baseline configuration inheritance details.

### Dual-pane Model Picker (`apps/desktop/src/renderer/src/components/ai-chat/model-picker/`)

The chat composer model selector uses a **dual-pane / multi-column popover** (`w-[540px]`, `h-[380px]`):
- **Left pane (Provider Sidebar `w-[190px]`)**:
  - `All Models` summary item with total model count badge.
  - List of configured providers with brand icon (`ProviderIcon` with name inference), provider title, API style subtext, model count pill, and active dot.
  - Sticky bottom `Manage Providers` action leading directly to `#/settings/providers`.
- **Right pane (Model Search & List)**:
  - Sticky top search input filtering models by label, ID, or provider name in real time.
  - Model rows with Lobe model brand icon (`ModelBrandIcon`), label, monospace model ID, role badges (`⚡ Fast`, `🧠 Thinking`), and checkmark on active selection.
  - Clicking any model auto-activates its provider and updates the session model in one step.

### What this page is not

Not a Codex `auth.json` / `config.toml` raw editor. Not a Claude-Code role matrix (Sonnet / Opus / Haiku / Subagent) unless we later add a Claude-Code export. Role fields here are **our** Primary / Fast / Reasoning slots for the agent runtime — keep them optional and short.
