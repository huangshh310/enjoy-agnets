/**
 * 根错误边界：捕获未处理渲染异常，默认面不摊英文堆栈。
 */
import { Component, type ErrorInfo, type ReactNode } from "react"
import { useI18n } from "@renderer/i18n"
import { CrashFallback } from "./crash-fallback.ts"
import { logRendererCrash } from "./crash-fallback-copy.ts"

type Props = { children: ReactNode }
type State = { error: Error | null }

export function CrashFallbackHost({
  error,
  onReload
}: {
  error?: unknown
  onReload: () => void
}) {
  const { locale } = useI18n()
  return <CrashFallback error={error} onReload={onReload} locale={locale} />
}

export class RendererErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logRendererCrash(error, info)
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <CrashFallbackHost
        error={this.state.error}
        onReload={() => {
          this.setState({ error: null })
          window.location.reload()
        }}
      />
    )
  }
}
