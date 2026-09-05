/**
 * 工作区资产发现与记忆点亮工坊 (Workspace Discovery Grid)。
 * 在 0 块冷启动时引导用户一键将工作区项目目录分块向量化，告别空洞与冷冰冰的“还不能问”。
 */
import type { ReactNode } from "react"
import { RiAddLine, RiFlashlightLine, RiFolder6Line, RiFolderLine, RiSparklingLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import { useT } from "@renderer/i18n"

export function KnowledgeWorkspaceDiscovery({
  workspaceDirs,
  indexing,
  onIndexFolder,
  onOpenAddModal
}: {
  workspaceDirs: string[]
  indexing: boolean
  onIndexFolder: (path: string) => void
  onOpenAddModal: () => void
}) {
  const t = useT()
  const displayDirs = workspaceDirs.length > 0 ? workspaceDirs : []

  return (
    <div className="flex flex-col gap-4 py-2 animate-in fade-in duration-200">
      <div className="flex items-start gap-3 rounded-2xl border border-accent-500/20 bg-accent-500/5 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent-500/25 bg-accent-500/10 text-accent-600 dark:text-accent-400">
          <RiSparklingLine className="size-5" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <h4 className="text-caption-1-medium text-text-primary">{t("pages.knowledge.discoveryTitle")}</h4>
          <p className="mt-0.5 text-caption-2-regular text-text-secondary">{t("pages.knowledge.discoveryHint")}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <DiscoveryCard
          title={t("pages.knowledge.workspaceRootDot")}
          subtitle={t("pages.knowledge.presetRootDesc")}
          path="."
          icon={<RiFolder6Line className="size-4 text-accent-500" />}
          indexing={indexing}
          buttonLabel={t("pages.knowledge.initIndex")}
          onIndex={() => onIndexFolder(".")}
        />

        {displayDirs.map((dir) => (
          <DiscoveryCard
            key={dir}
            title={`${dir}/`}
            subtitle={t("pages.knowledge.presetSrcDesc")}
            path={dir}
            icon={<RiFolderLine className="size-4 text-accent-500" />}
            indexing={indexing}
            buttonLabel={t("pages.knowledge.initProject")}
            onIndex={() => onIndexFolder(dir)}
          />
        ))}
      </div>

      <div className="flex items-center justify-end pt-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onOpenAddModal}
          className="h-7.5 gap-1 text-caption-2-medium text-text-secondary hover:text-text-primary"
        >
          <RiAddLine className="size-3.5" />
          <span>{t("pages.knowledge.addOtherSource")}</span>
        </Button>
      </div>
    </div>
  )
}

function DiscoveryCard({
  title,
  subtitle,
  path,
  icon,
  indexing,
  buttonLabel,
  onIndex
}: {
  title: string
  subtitle: string
  path: string
  icon: ReactNode
  indexing: boolean
  buttonLabel: string
  onIndex: () => void
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-separator-border/70 bg-background-secondary-default/30 p-4 transition-all hover:border-accent-500/40 hover:bg-background-secondary-default/60">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {icon}
          <span className="truncate font-mono text-caption-1-medium text-text-primary">{title}</span>
        </div>
        <p className="line-clamp-2 text-caption-2-regular text-text-tertiary">{subtitle}</p>
      </div>
      <div className="mt-3.5 flex items-center justify-between border-t border-separator-border/40 pt-2.5">
        <span className="font-mono text-caption-2-regular text-text-tertiary">{path}</span>
        <Button
          size="sm"
          disabled={indexing}
          onClick={onIndex}
          className="h-7 gap-1 px-2.5 text-caption-2-medium shadow-2xs"
        >
          <RiFlashlightLine className="size-3" />
          <span>{buttonLabel}</span>
        </Button>
      </div>
    </div>
  )
}
