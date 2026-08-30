import { clsx, type ClassValue } from "clsx"
import { cx } from "@/utils/cx"

/**
 * shadcn/ui merge helper. Runs `clsx` then BoardUI's `cx` (tailwind-merge
 * that understands composite type utilities like `text-body-medium`).
 */
export function cn(...inputs: ClassValue[]) {
  return cx(clsx(inputs))
}
