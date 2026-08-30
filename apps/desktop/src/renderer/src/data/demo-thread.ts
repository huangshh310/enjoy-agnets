export type ChatRole = "user" | "assistant"

export type CodeAttachment = {
  language: string
  filename: string
  additions: number
  deletions: number
  code: string
}

export type ThreadMessage = {
  id: string
  role: ChatRole
  content: string
  createdAt: number
  attachment?: CodeAttachment
  streaming?: boolean
}

export const DEMO_THEME_TOGGLE_CODE = [
  'const nextTheme = theme === "dark" ? "light" : "dark";',
  "document.documentElement.classList.toggle(",
  '  "dark",',
  '  nextTheme === "dark",',
  ");",
  'localStorage.setItem("boardui:theme", nextTheme);'
].join("\n")

export const DEMO_BUTTON_FILE = [
  'import type { Metadata } from "next";',
  'import Link from "next/link";',
  'import { ComponentDetail } from "@/components/application/docs/component-detail";',
  'import { DashboardShell } from "@/components/application/dashboard/dashboard-shell";',
  "",
  "export const metadata: Metadata = {",
  '  title: "Home Dashboard Template — React + Tailwind (Pro)",',
  '  description:',
  '    "Full admin dashboard template for React + Tailwind CSS — sidebar navigation, KPI cards, bar chart, and a customers data table. A BoardUI Pro template.",',
  "};",
  "",
  "const PREVIEW_CODE = `import { DashboardShell } from",
  '  "@/components/application/dashboard/dashboard-shell"`;',
  "",
  "export default function DashboardPage() {",
  "  // Full screen: floating sidebar, header,",
  "  // KPI cards,",
  "  // earnings bar chart, and the customers",
  "  // data table.",
  "  return <DashboardShell />;",
  "}"
].join("\n")

export function createDemoThread(): ThreadMessage[] {
  const now = Date.now()
  return [
    {
      id: "msg_user_demo",
      role: "user",
      createdAt: now - 60_000,
      content:
        "update our color tokens for dark mode and add a reusable theme toggle to the registry. run lint and a production build when you're done."
    },
    {
      id: "msg_assistant_demo",
      role: "assistant",
      createdAt: now - 40_000,
      content:
        "Done — the semantic dark-mode tokens and reusable theme toggle are wired. The toggle updates the root theme from one place and persists the selection:",
      attachment: {
        language: "TSX",
        filename: "theme-toggle.tsx",
        additions: 156,
        deletions: 23,
        code: DEMO_THEME_TOGGLE_CODE
      }
    }
  ]
}
