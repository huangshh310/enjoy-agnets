/**
 * 自定义 API 端点 / 网关快速接入横幅：
 * 提供 OpenAI /v1 与 Anthropic Messages 协议的一键快速创建入口。
 */
import { RiAddLine, RiFlashlightLine, RiServerLine } from "@remixicon/react"
import { Button } from "@/components/ui/button"
import type { ApiStyle, ProviderKind } from "@enjoy-agents/providers/presets"

export function ProviderCustomBanner({
  onSelect
}: {
  onSelect: (kind: ProviderKind, apiStyle: ApiStyle) => void
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border-button-default bg-linear-to-br from-background-secondary-default/80 via-background-primary-default to-background-secondary-default/50 p-5 shadow-xs transition-all hover:border-border-button-hover">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border-button-default bg-background-primary-default text-accent-600 shadow-xs">
            <RiServerLine className="size-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-body-medium font-semibold text-text-primary">
                Custom API Endpoint / Gateway
              </h3>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-caption-1-semibold text-accent-600 dark:bg-accent-950/60 dark:text-accent-300">
                <RiFlashlightLine className="size-3" />
                Recommended for Proxies
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-caption-1-medium text-text-secondary leading-relaxed">
              Connect any OneAPI, NewAPI, enterprise gateway, vLLM, or self-hosted endpoint compatible with OpenAI or Anthropic protocols.
            </p>
          </div>
        </div>

        {/* 快捷协议创建按钮组 */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start md:self-auto">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onSelect("custom", "anthropic")}
            className="rounded-xl border-border-button-default bg-background-primary-default text-text-primary hover:bg-background-secondary-hover"
          >
            <RiAddLine className="size-3.5 mr-1" />
            Anthropic Messages
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => onSelect("custom", "openai")}
            className="rounded-xl"
          >
            <RiAddLine className="size-3.5 mr-1" />
            OpenAI /v1 Endpoint
          </Button>
        </div>
      </div>
    </section>
  )
}
