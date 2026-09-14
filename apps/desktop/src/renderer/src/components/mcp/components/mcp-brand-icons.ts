/**
 * MCP 生态品牌官方图标组件：使用 Lobe Icons、Devicon 与 Simple Icons 官方高保真矢量。
 * 使用 React.createElement 以保证 Node.js 测试与 Electron 渲染进程双端原生兼容。
 */
import { createElement as h, type CSSProperties } from "react"
import { RiBrainLine, RiGlobalLine, RiHardDrive2Line, RiMindMap } from "@remixicon/react"
import {
  DockerBrandSvg,
  GitLabBrandSvg,
  MySqlBrandSvg,
  PlaywrightBrandSvg,
  PostgreSqlBrandSvg,
  PuppeteerBrandSvg,
  RedisBrandSvg,
  SlackBrandSvg,
  SqliteBrandSvg
} from "./mcp-brand-svgs.ts"

export interface McpBrandIconProps {
  className?: string
  size?: number | string
  style?: CSSProperties
  "aria-hidden"?: boolean | "true" | "false"
  [key: string]: unknown
}

function resolveIconSize(size?: number | string, className?: string): number {
  if (typeof size === "number" && size > 0) return size
  if (className) {
    const match = className.match(/(?:^|\s)size-(?:\[(\d+)px\]|([0-9.]+))(?=\s|$)/)
    if (match) {
      if (match[1]) return parseInt(match[1], 10)
      const val = parseFloat(match[2])
      return Math.round(val * 4)
    }
  }
  return 16
}

export function GithubIcon(props: McpBrandIconProps) {
  const size = resolveIconSize(props.size, props.className)
  return h(
    "svg",
    { viewBox: "0 0 24 24", fill: "currentColor", fillRule: "evenodd", width: size, height: size, ...props },
    h("path", {
      d: "M12 0c6.63 0 12 5.276 12 11.79-.001 5.067-3.29 9.567-8.175 11.187-.6.118-.825-.25-.825-.56 0-.398.015-1.665.015-3.242 0-1.105-.375-1.813-.81-2.181 2.67-.295 5.475-1.297 5.475-5.822 0-1.297-.465-2.344-1.23-3.169.12-.295.54-1.503-.12-3.125 0 0-1.005-.324-3.3 1.209a11.32 11.32 0 00-3-.398c-1.02 0-2.04.133-3 .398-2.295-1.518-3.3-1.209-3.3-1.209-.66 1.622-.24 2.83-.12 3.125-.765.825-1.23 1.887-1.23 3.169 0 4.51 2.79 5.527 5.46 5.822-.345.294-.66.81-.765 1.577-.69.31-2.415.81-3.495-.973-.225-.354-.9-1.223-1.845-1.209-1.005.015-.405.56.015.781.51.28 1.095 1.327 1.23 1.666.24.663 1.02 1.93 4.035 1.385 0 .988.015 1.916.015 2.196 0 .31-.225.664-.825.56C3.303 21.374-.003 16.867 0 11.791 0 5.276 5.37 0 12 0z"
    })
  )
}
export const GitHubIcon = GithubIcon

export function BraveIcon(props: McpBrandIconProps) {
  const size = resolveIconSize(props.size, props.className)
  return h(
    "svg",
    { viewBox: "0 0 24 24", width: size, height: size, ...props },
    h("defs", null,
      h("linearGradient", { id: "mcp-brave-grad", x1: "1.506", y1: "24.174", x2: "22", y2: "24.174", gradientUnits: "userSpaceOnUse" },
        h("stop", { stopColor: "#FF5601" }),
        h("stop", { offset: ".5", stopColor: "#FF4000" }),
        h("stop", { offset: "1", stopColor: "#FF1F01" })
      )
    ),
    h("path", {
      fill: "url(#mcp-brave-grad)",
      d: "M17.544 2.375c.017-.005 1.844-.5 2.712.361.872.872 1.588 1.642 1.588 1.642l-.565 1.38v-.003.006-.003L22 7.8c-.014.05-2.112 7.983-2.357 8.954-.488 1.924-.819 2.663-2.202 3.638a212.634 212.634 0 01-4.305 2.917c-.41.252-.92.691-1.383.691-.463 0-.974-.439-1.383-.691a213.099 213.099 0 01-4.306-2.917c-1.383-.975-1.72-1.714-2.2-3.632-.246-.977-2.35-8.904-2.364-8.96l.722-2.045-.566-1.383s.722-.764 1.594-1.63c.866-.872 2.712-.36 2.712-.36L8.066 0h7.373l2.105 2.375zm-5.797 12.557c-.138 0-1.04.318-1.762.691l-.457.234c-.487.253-.823.428-.956.506-.168.108-.066.306.09.414.15.103 2.195 1.684 2.394 1.865l.09.078c.186.168.432.391.607.391.174 0 .415-.223.607-.391l.084-.078c.2-.169 2.244-1.756 2.394-1.865.15-.108.258-.3.09-.408-.133-.084-.475-.253-.956-.506h-.006l-.457-.24c-.722-.373-1.623-.691-1.762-.691zm.006-11.276c-.35.02-.694.092-1.023.211l-.378.126c-.493.169-.969.331-1.21.331-.312 0-2.554-.428-2.584-.433 0 0-2.706 3.26-2.706 3.957 0 .577.228.805.504 1.07l.174.175 2.033 2.152.06.067c.204.204.5.498.29.998l-.043.102c-.228.535-.511 1.203-.15 1.876.384.716 1.046 1.19 1.467 1.118.42-.084 1.419-.601 1.78-.841.367-.229 1.52-1.19 1.521-1.551 0-.307-.829-.812-1.238-1.053l-.18-.12-.199-.12c-.367-.229-1.035-.644-1.047-.825-.018-.228-.017-.294.283-.853l.21-.379c.289-.487.602-1.029.536-1.426-.085-.433-.777-.685-1.36-.901l-.21-.078-.613-.229c-.583-.222-1.232-.463-1.34-.511-.145-.073-.11-.132.335-.174l.223-.025c.553-.06 1.582-.168 2.08-.03l.32.09c.564.145 1.25.337 1.316.445l.03.048c.067.09.109.145.037.53l-.121.607c-.15.806-.391 2.069-.421 2.351l-.012.115c-.042.312-.066.529.301.613.438.119.884.206 1.335.259.216 0 .824-.144 1.24-.24l.095-.025c.367-.078.343-.289.3-.602l-.011-.12c-.03-.282-.27-1.54-.42-2.345l-.122-.614c-.072-.384-.024-.439.036-.529l.03-.048c.067-.108.753-.294 1.318-.444l.318-.091c.5-.138 1.528-.03 2.081.03l.216.018c.451.048.493.108.343.18-.11.049-.758.29-1.341.512-.273.108-.547.21-.823.307-.583.216-1.275.468-1.36.907-.066.391.247.939.535 1.42l.21.379c.301.56.308.625.284.854-.012.18-.68.595-1.053.824l-.192.126-.181.108c-.41.247-1.238.758-1.238 1.059 0 .367 1.16 1.316 1.521 1.55.367.235 1.36.758 1.78.836.421.078 1.082-.396 1.467-1.112.36-.673.078-1.335-.15-1.876l-.042-.102c-.21-.5.084-.794.289-1.004l.065-.06 2.02-2.147.181-.181c.271-.265.505-.493.505-1.07 0-.698-2.706-3.957-2.706-3.957-.03.006-2.275.44-2.586.44l.007-.007c-.252 0-.722-.156-1.215-.337l-.379-.12c-.612-.21-1.02-.21-1.022-.21z"
    })
  )
}

export function NotionIcon(props: McpBrandIconProps) {
  const size = resolveIconSize(props.size, props.className)
  return h(
    "svg",
    { viewBox: "0 0 24 24", fill: "currentColor", fillRule: "evenodd", width: size, height: size, ...props },
    h("path", {
      clipRule: "evenodd",
      d: "M15.257.055l-13.31.98C.874 1.128.5 1.83.5 2.667v14.559c0 .654.233 1.213.794 1.96l3.129 4.06c.513.653.98.794 1.962.745l15.457-.932c1.307-.093 1.681-.7 1.681-1.727V4.954c0-.53-.21-.684-.829-1.135l-.106-.078L18.34.755c-1.027-.746-1.45-.84-3.083-.7zm-8.521 4.63c-1.263.086-1.549.105-2.266-.477L2.647 2.76c-.186-.187-.092-.42.375-.466l12.796-.933c1.074-.094 1.634.28 2.054.606l2.195 1.587c.093.047.326.326.047.326l-13.216.794-.162.01zM5.263 21.193V7.287c0-.606.187-.886.748-.933l15.176-.886c.515-.047.748.28.748.886v13.81c0 .609-.093 1.122-.934 1.168l-14.523.84c-.842.047-1.215-.232-1.215-.98zm14.338-13.16c.093.422 0 .842-.422.89l-.699.139v10.264c-.608.327-1.168.513-1.635.513-.747 0-.934-.232-1.495-.932l-4.576-7.185v6.952l1.448.327s0 .84-1.169.84l-3.221.186c-.094-.187 0-.654.327-.747l.84-.232V9.853L7.832 9.76c-.093-.42.14-1.026.794-1.073l3.456-.232 4.763 7.279v-6.44l-1.214-.14c-.094-.513.28-.887.747-.933l3.223-.187z"
    })
  )
}

export function McpIcon(props: McpBrandIconProps = {}) {
  const { size: propSize, className, ...rest } = props
  const size = resolveIconSize(propSize, className)
  return h(
    "svg",
    {
      viewBox: "0 0 24 24",
      fill: "currentColor",
      fillRule: "evenodd",
      width: size,
      height: size,
      className,
      ...rest
    },
    h("path", {
      d: "M15.688 2.343a2.588 2.588 0 00-3.61 0l-9.626 9.44a.863.863 0 01-1.203 0 .823.823 0 010-1.18l9.626-9.44a4.313 4.313 0 016.016 0 4.116 4.116 0 011.204 3.54 4.3 4.3 0 013.609 1.18l.05.05a4.115 4.115 0 010 5.9l-8.706 8.537a.274.274 0 000 .393l1.788 1.754a.823.823 0 010 1.18.863.863 0 01-1.203 0l-1.788-1.753a1.92 1.92 0 010-2.754l8.706-8.538a2.47 2.47 0 000-3.54l-.05-.049a2.588 2.588 0 00-3.607-.003l-7.172 7.034-.002.002-.098.097a.863.863 0 01-1.204 0 .823.823 0 010-1.18l7.273-7.133a2.47 2.47 0 00-.003-3.537z"
    }),
    h("path", {
      d: "M14.485 4.703a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a4.115 4.115 0 000 5.9 4.314 4.314 0 006.016 0l7.12-6.982a.823.823 0 000-1.18.863.863 0 00-1.204 0l-7.119 6.982a2.588 2.588 0 01-3.61 0 2.47 2.47 0 010-3.54l7.12-6.982z"
    })
  )
}

export function DockerIcon(props: McpBrandIconProps) {
  return h(DockerBrandSvg, { ...props, "aria-hidden": true })
}

export function PostgreSqlIcon(props: McpBrandIconProps) {
  return h(PostgreSqlBrandSvg, { ...props, "aria-hidden": true })
}
export const PostgresIcon = PostgreSqlIcon

export function SqliteIcon(props: McpBrandIconProps) {
  return h(SqliteBrandSvg, { ...props, "aria-hidden": true })
}

export function MySqlIcon(props: McpBrandIconProps) {
  return h(MySqlBrandSvg, { ...props, "aria-hidden": true })
}

export function RedisIcon(props: McpBrandIconProps) {
  return h(RedisBrandSvg, { ...props, "aria-hidden": true })
}

export function GitLabIcon(props: McpBrandIconProps) {
  return h(GitLabBrandSvg, { ...props, "aria-hidden": true })
}

export function SlackIcon(props: McpBrandIconProps) {
  return h(SlackBrandSvg, { ...props, "aria-hidden": true })
}

export function PlaywrightIcon(props: McpBrandIconProps) {
  return h(PlaywrightBrandSvg, { ...props, "aria-hidden": true })
}

export function PuppeteerIcon(props: McpBrandIconProps) {
  return h(PuppeteerBrandSvg, { ...props, "aria-hidden": true })
}

export function LinearIcon(props: McpBrandIconProps) {
  return h(
    "svg",
    { viewBox: "0 0 24 24", fill: "currentColor", ...props, "aria-hidden": true },
    h("path", {
      d: "M2.886 4.18A11.982 11.982 0 0 1 11.99 0C18.624 0 24 5.376 24 12.009c0 3.64-1.62 6.903-4.18 9.105L2.887 4.18ZM1.817 5.626l16.556 16.556c-.524.33-1.075.62-1.65.866L.951 7.277c.247-.575.537-1.126.866-1.65ZM.322 9.163l14.515 14.515c-.71.172-1.443.282-2.195.322L0 11.358a12 12 0 0 1 .322-2.195Zm-.17 4.862 9.823 9.824a12.02 12.02 0 0 1-9.824-9.824Z"
    })
  )
}

export function SentryIcon(props: McpBrandIconProps) {
  return h(
    "svg",
    { viewBox: "0 0 24 24", fill: "currentColor", ...props, "aria-hidden": true },
    h("path", {
      d: "M13.91 2.505c-.873-1.448-2.972-1.448-3.844 0L6.904 7.92a15.478 15.478 0 0 1 8.53 12.811h-2.221A13.301 13.301 0 0 0 5.784 9.814l-2.926 5.06a7.65 7.65 0 0 1 4.435 5.848H2.194a.365.365 0 0 1-.298-.534l1.413-2.402a5.16 5.16 0 0 0-1.614-.913L.296 19.275a2.182 2.182 0 0 0 .812 2.999 2.24 2.24 0 0 0 1.086.288h6.983a9.322 9.322 0 0 0-3.845-8.318l1.11-1.922a11.47 11.47 0 0 1 4.95 10.24h5.915a17.242 17.242 0 0 0-7.885-15.28l2.244-3.845a.37.37 0 0 1 .504-.13c.255.14 9.75 16.708 9.928 16.9a.365.365 0 0 1-.327.543h-2.287c.029.612.029 1.223 0 1.831h2.297a2.206 2.206 0 0 0 1.922-3.31z"
    })
  )
}

export function GitIcon(props: McpBrandIconProps) {
  return h(
    "svg",
    { viewBox: "0 0 128 128", ...props, "aria-hidden": true },
    h("path", {
      fill: "#F34F29",
      d: "M124.737 58.378L69.621 3.264c-3.172-3.174-8.32-3.174-11.497 0L46.68 14.71l14.518 14.518c3.375-1.139 7.243-.375 9.932 2.314 2.703 2.706 3.461 6.607 2.294 9.993l13.992 13.993c3.385-1.167 7.292-.413 9.994 2.295 3.78 3.777 3.78 9.9 0 13.679a9.673 9.673 0 01-13.683 0 9.677 9.677 0 01-2.105-10.521L68.574 47.933l-.002 34.341a9.708 9.708 0 012.559 1.828c3.778 3.777 3.778 9.898 0 13.683-3.779 3.777-9.904 3.777-13.679 0-3.778-3.784-3.778-9.905 0-13.683a9.65 9.65 0 013.167-2.11V47.333a9.581 9.581 0 01-3.167-2.111c-2.862-2.86-3.551-7.06-2.083-10.576L41.056 20.333 3.264 58.123a8.133 8.133 0 000 11.5l55.117 55.114c3.174 3.174 8.32 3.174 11.499 0l54.858-54.858a8.135 8.135 0 00-.001-11.501z"
    })
  )
}

export function FilesystemIcon(props: McpBrandIconProps) {
  return h(RiHardDrive2Line, { className: props.className, "aria-hidden": true })
}

export function MemoryGraphIcon(props: McpBrandIconProps) {
  return h(RiMindMap, { className: props.className, "aria-hidden": true })
}

export function FetchWebIcon(props: McpBrandIconProps) {
  return h(RiGlobalLine, { className: props.className, "aria-hidden": true })
}

export function SequentialThinkingIcon(props: McpBrandIconProps) {
  return h(RiBrainLine, { className: props.className, "aria-hidden": true })
}
