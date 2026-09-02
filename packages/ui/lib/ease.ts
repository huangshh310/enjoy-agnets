/**
 * 运动曲线：对齐 BeUI / CSS token，不用默认 ease-in/out。
 */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

export const SPRING_PRESS = {
  type: "spring" as const,
  stiffness: 500,
  damping: 30,
  mass: 0.6
}

/** 共享布局位移：刻度金字塔、预览卡片跟手。 */
export const SPRING_LAYOUT = {
  type: "spring" as const,
  stiffness: 360,
  damping: 32,
  mass: 0.6
}
