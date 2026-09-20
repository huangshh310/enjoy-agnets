/**
 * 开流旁 Skills/MCP 诚实微条。无第二套 CRUD，管理只深链 #/mcp · #/skills。
 */
import { useNavigate } from "@tanstack/react-router"
import { useT } from "@renderer/i18n"
import { cx } from "@/utils/cx"
import { hostInjectCountLane, type HostInjectBarView } from "./host-inject-view.ts"
import { useHostInjectBar } from "./use-host-inject-bar.ts"

export function HostInjectBar() {
  const view = useHostInjectBar()
  if (view.kind === "hidden") return null
  return <HostInjectBarBody view={view} />
}

function HostInjectBarBody({ view }: { view: Exclude<HostInjectBarView, { kind: "hidden" }> }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <div data-testid="host-inject-bar" data-kind={view.kind}>
      <HostInjectBarContent view={view} t={t} navigate={navigate} />
      <p className="px-3.5 pb-2 text-caption-2-regular text-text-tertiary">{t("chat.hostInjectFootnote")}</p>
    </div>
  )
}

function HostInjectBarContent({
  view,
  t,
  navigate
}: {
  view: Exclude<HostInjectBarView, { kind: "hidden" }>
  t: ReturnType<typeof useT>
  navigate: ReturnType<typeof useNavigate>
}) {
  if (view.kind === "unsupported") {
    return (
      <div className="flex flex-col gap-1.5 px-3.5 pb-1">
        {view.mcp ? (
          <WarnLine text={t("chat.hostInjectMcpUnsupported")} />
        ) : null}
        {view.skills ? (
          <WarnLine text={t("chat.hostInjectSkillsUnsupported")} />
        ) : null}
        <ManageLinks
          onMcp={() => void navigate({ to: "/mcp" })}
          onSkills={() => void navigate({ to: "/skills" })}
        />
      </div>
    )
  }
  if (view.kind === "failed") {
    return (
      <div className="flex flex-col gap-1 px-3.5 pb-1">
        <WarnLine
          text={t("chat.hostInjectSkipped", { names: view.skipped.map((item) => item.name).join(" · ") })}
        />
        <ManageLinks
          onMcp={() => void navigate({ to: "/mcp" })}
          onSkills={() => void navigate({ to: "/skills" })}
        />
      </div>
    )
  }
  if (view.kind === "enabled") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 pb-1">
        <p className="text-caption-2-medium text-text-secondary">{enabledCountText(t, view.mcp, view.skills)}</p>
        <ManageLinks
          onMcp={() => void navigate({ to: "/mcp" })}
          onSkills={() => void navigate({ to: "/skills" })}
        />
      </div>
    )
  }
  return <InjectedDetails view={view} />
}

function InjectedDetails({
  view
}: {
  view: Extract<HostInjectBarView, { kind: "injected" }>
}) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <details className="mx-3 mb-1 overflow-hidden rounded-xl border border-border-button-default bg-accent-50/40">
      <summary className="cursor-pointer list-none px-3 py-1.5 text-caption-2-medium text-accent-600 [&::-webkit-details-marker]:hidden">
        {injectedCountText(t, view.mcp, view.skills)}
      </summary>
      <p className="border-t border-accent-500/15 px-3 py-1.5 text-caption-2-regular text-text-primary">
        {view.names.join(" · ")}
      </p>
      {view.skipped.length > 0 ? (
        <p className="px-3 pb-1.5 text-caption-2-regular text-text-warning-primary">
          {t("chat.hostInjectSkipped", { names: view.skipped.map((item) => item.name).join(" · ") })}
        </p>
      ) : null}
      <div className="px-3 pb-2">
        <ManageLinks
          onMcp={() => void navigate({ to: "/mcp" })}
          onSkills={() => void navigate({ to: "/skills" })}
        />
      </div>
    </details>
  )
}

function enabledCountText(t: ReturnType<typeof useT>, mcp: number, skills: number): string {
  const lane = hostInjectCountLane(mcp, skills)
  if (lane === "both") return t("chat.hostInjectEnabled", { mcp, skills })
  if (lane === "mcp") return t("chat.hostInjectEnabledMcp", { mcp })
  return t("chat.hostInjectEnabledSkills", { skills })
}

function injectedCountText(t: ReturnType<typeof useT>, mcp: number, skills: number): string {
  const lane = hostInjectCountLane(mcp, skills)
  if (lane === "both") return t("chat.hostInjectedTurn", { mcp, skills })
  if (lane === "mcp") return t("chat.hostInjectedTurnMcp", { mcp })
  return t("chat.hostInjectedTurnSkills", { skills })
}

function WarnLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-border-button-default bg-background-secondary-default px-2.5 py-1.5">
      <span className="mt-1 size-2 shrink-0 rounded-full bg-text-warning-primary" />
      <p className="text-caption-2-medium text-text-warning-primary">{text}</p>
    </div>
  )
}

function ManageLinks({ onMcp, onSkills }: { onMcp: () => void; onSkills: () => void }) {
  const t = useT()
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onMcp}
        className={cx("text-caption-2-medium text-accent-600 hover:text-accent-500")}
      >
        {t("chat.hostInjectManageMcp")}
      </button>
      <button
        type="button"
        onClick={onSkills}
        className="text-caption-2-medium text-accent-600 hover:text-accent-500"
      >
        {t("chat.hostInjectManageSkills")}
      </button>
    </div>
  )
}
