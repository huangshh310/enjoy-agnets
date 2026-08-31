/**
 * 生成中点阵：指针跟随与画点，从 canvas effect 拆出以控制函数长度。
 */

export type DitherPointer = {
  x: number
  y: number
  targetX: number
  targetY: number
  inside: boolean
}

const DOT_GAP = 10
const TWO_PI = Math.PI * 2

export function wanderPointer(pointer: DitherPointer, width: number, height: number, time: number, reduce: boolean) {
  if (pointer.inside) return
  pointer.targetX = width / 2 + (reduce ? 0 : Math.sin(time / 1700) * width * 0.12)
  pointer.targetY = height / 2 + (reduce ? 0 : Math.cos(time / 2100) * height * 0.1)
}

export function stepPointer(pointer: DitherPointer, reduce: boolean) {
  const follow = reduce ? 1 : pointer.inside ? 0.16 : 0.045
  pointer.x += (pointer.targetX - pointer.x) * follow
  pointer.y += (pointer.targetY - pointer.y) * follow
}

export function fitDitherCanvas(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  pointer: DitherPointer
) {
  const rect = canvas.getBoundingClientRect()
  const width = rect.width || 208
  const height = rect.height || 208
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  context.setTransform(dpr, 0, 0, dpr, 0, 0)
  pointer.x = width / 2
  pointer.y = height / 2
  pointer.targetX = pointer.x
  pointer.targetY = pointer.y
  return { width, height, color: window.getComputedStyle(canvas).color }
}

export function paintDitherDots(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pointer: DitherPointer,
  color: string
) {
  const radius = Math.min(width, height) * 0.38
  const columns = Math.ceil(width / DOT_GAP) + 1
  const rows = Math.ceil(height / DOT_GAP) + 1
  const offsetX = (width - (columns - 1) * DOT_GAP) / 2
  const offsetY = (height - (rows - 1) * DOT_GAP) / 2
  context.fillStyle = color
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      paintOneDot(context, offsetX + column * DOT_GAP, offsetY + row * DOT_GAP, pointer, radius)
    }
  }
  context.globalAlpha = 1
}

function paintOneDot(
  context: CanvasRenderingContext2D,
  anchorX: number,
  anchorY: number,
  pointer: DitherPointer,
  radius: number
) {
  const deltaX = anchorX - pointer.x
  const deltaY = anchorY - pointer.y
  const distance = Math.hypot(deltaX, deltaY)
  const proximity = Math.max(0, 1 - distance / radius)
  const influence = proximity * proximity * (3 - 2 * proximity)
  const push = influence * influence * 9
  const dirX = distance > 0 ? deltaX / distance : 0
  const dirY = distance > 0 ? deltaY / distance : 0
  context.globalAlpha = 0.17 + influence * 0.72
  context.beginPath()
  context.arc(anchorX + dirX * push, anchorY + dirY * push, 0.65 + influence * 0.85, 0, TWO_PI)
  context.fill()
}
