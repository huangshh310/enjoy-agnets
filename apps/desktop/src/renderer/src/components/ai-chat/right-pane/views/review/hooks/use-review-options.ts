/**
 * 审查栏交互与偏好状态 Hook：
 * 管理作用域选定、自动换行、隐藏空白字符、文件树显隐、Diff卡片全展开/全折叠以及快速跳转弹窗状态。
 */

import { useState, useCallback } from "react"
import type { ReviewOptions, ReviewScope } from "../types/review.types"
import { DEFAULT_REVIEW_OPTIONS } from "../constants/review-constants"

export function useReviewOptions(initialScope: ReviewScope = "branch") {
  const [scope, setScope] = useState<ReviewScope>(initialScope)
  const [options, setOptions] = useState<ReviewOptions>(DEFAULT_REVIEW_OPTIONS)
  const [allExpanded, setAllExpanded] = useState<boolean>(false)
  const [jumpOpen, setJumpOpen] = useState<boolean>(false)

  const toggleOption = useCallback((key: keyof ReviewOptions) => {
    setOptions((prev) => ({
      ...prev,
      [key]: !prev[key]
    }))
  }, [])

  const setOption = useCallback(<K extends keyof ReviewOptions>(key: K, val: ReviewOptions[K]) => {
    setOptions((prev) => ({
      ...prev,
      [key]: val
    }))
  }, [])

  const toggleAllExpanded = useCallback(() => {
    setAllExpanded((prev) => !prev)
  }, [])

  return {
    scope,
    setScope,
    options,
    setOption,
    toggleOption,
    allExpanded,
    toggleAllExpanded,
    jumpOpen,
    setJumpOpen
  }
}
