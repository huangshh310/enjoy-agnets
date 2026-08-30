import { type AnchorHTMLAttributes, type ReactNode } from "react"

export default function Link({
  href = "#",
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href?: string; children?: ReactNode }) {
  return (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  )
}
