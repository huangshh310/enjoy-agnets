/**
 * 描边滤镜 defs：ink 与 sketch 共用挂载点，滤镜 id 分开。
 */
export function InkSketchFilters() {
  return (
    <svg className="pointer-events-none absolute h-0 w-0 overflow-hidden" aria-hidden="true">
      <defs>
        <filter id="skin-ink-sketchy" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="turbulence" baseFrequency="0.035 0.042" numOctaves={4} result="noise" seed={42} />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="skin-ink-sketchy-sm" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="turbulence" baseFrequency="0.06" numOctaves={3} result="noise" seed={7} />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="skin-sketchy" x="-8%" y="-8%" width="116%" height="116%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} result="noise" seed={3} />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="skin-sketchy-sm" x="-12%" y="-12%" width="124%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves={2} result="noise" seed={9} />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  )
}
