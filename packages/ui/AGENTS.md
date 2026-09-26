<!-- boardui:rules:start -->
# BoardUI design rules

This project uses BoardUI **tokens** (Tailwind CSS v4, `styles/`) with shadcn/ui primitives and AI Elements for agent chrome. These rules always apply when writing UI code.

## Components first

- Visual language is BoardUI tokens in `styles/`. Primitives come from shadcn/ui (`components/ui/`). Agent chrome comes from AI Elements (`components/ai-elements/`).
- Before hand-building any UI element: (1) shadcn/ui, (2) AI Elements, (3) Beautiful UI / BeUI / Rare UI / 21st / Motion Primitives / vgpu / ThreeUI / Fluid Functionalism. Copy the interaction, restyle to BoardUI tokens. Never ship a registry default skin.
- Install with `pnpm dlx shadcn@latest add <name>` or `pnpm dlx shadcn@latest add @ai-elements/<name>` from `packages/ui` or `apps/desktop`.
- Keep BoardUI **ThemeToggle** and **ComposerLoader**. Do not add new BoardUI `components/base/*` primitives.
- Import primitives from `@/components/ui/button` (etc). Merge classes with `cn()` from `@/lib/utils` or `cx()` from `@/utils/cx`.
- See `design/specs/ui.md` and `design/references/visual-system.md` for the full stack, sourcing table, and look rules.
- After UI changes, run `pnpm lint` from the repo root. `@shadcn/lint` (oxlint, `.oxlintrc.json`) checks caller `className` against BoardUI contracts.

## Color: semantic tokens only

- Never use raw palette classes (`text-gray-500`, `bg-white`, `border-neutral-200`) or hex/oklch literals. Every color rides a BoardUI semantic token, which also makes dark mode automatic.
- Text: `text-text-primary`, `text-text-secondary`, `text-text-tertiary`, `text-text-placeholder`, errors `text-text-error-primary`.
- Surfaces: `bg-background-primary-default`, `bg-background-secondary-default` / `-hover`, `bg-background-tertiary-default`, page ground `bg-background-full`.
- Borders: `border-border-button-default` / `-hover`, hairlines `border-separator-border`, tables `border-border-table`, errors `border-border-error-default`.
- Icons: `text-foreground-icon-primary` through `text-foreground-icon-quaternary`.
- Charts: the `chart-1` … `chart-5` tokens (plus `-active` variants). CTAs and selection states: the `accent-50` … `accent-950` ramp.
- Dark mode flips tokens via the `.dark` class on `<html>`. Do not write `dark:` overrides with raw colors; if a token pair looks wrong in dark mode, pick a different token, not a literal.

## Typography: composite utilities only

- Use BoardUI's composite type utilities: `text-title-1-medium`, `text-title-2-medium`, `text-title-3-semibold`, `text-headline-medium`, `text-body-medium`, `text-body-regular`, `text-body-2-*`, `text-caption-1-semibold`, and friends. Each sets size, weight, line-height, and letter-spacing together.
- Never rebuild type by stacking `text-sm font-medium leading-5`; if a style seems missing, look in `styles/typography.css` before inventing one.

## Spacing and shape

- Stay on Tailwind's spacing scale (`gap-2`, `p-4`, `mt-6`); prefer flex/grid `gap` over per-child margins. Arbitrary values (`p-[13px]`) only when matching an existing BoardUI component exactly.
- Cards and panels: `rounded-3xl` with `border-border-button-default`. Inputs and menu rows: `rounded-md` to `rounded-xl`. Pills: `rounded-full`.

## Mechanics

- Merge classes with `cn()` from `@/lib/utils` or `cx()` from `@/utils/cx`. No string concatenation.
- Product chrome icons come from `@remixicon/react`, passed as component references. Lucide may remain inside installed shadcn files until restyled.
- AI / LLM brand marks (providers, models) come from `@lobehub/icons` ([lobehub.com/zh/icons](https://lobehub.com/zh/icons)). Prefer `.Color` when exported; use `ModelIcon` for model IDs; route app call sites through `ProviderIcon`. Never use Remix generic glyphs as brand logos. Custom / unknown → `RiServerLine` / `RiPlugLine`.
- Forms and overlays: shadcn `Dialog` / `Select` / `DropdownMenu` / `Input`. Do not add new React Aria BoardUI fields.
- Focus states: `outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring`.
- Unique keepers: ThemeToggle (circular reveal), ComposerLoader (composer rim).

When unsure about a token or look, read `design/specs/ui.md` then `design/references/visual-system.md`. For a missing primitive, install shadcn or `@ai-elements/*`, then restyle.
<!-- boardui:rules:end -->
