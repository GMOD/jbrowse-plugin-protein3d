import React from 'react'

export default function SplitString({
  str,
  gapSet,
  hoveredPosition,
  showHighlight,
  onMouseOver,
  onClick,
}: {
  str: string
  gapSet?: Set<number>
  hoveredPosition?: number
  showHighlight: boolean
  onMouseOver?: (arg: number) => void
  onClick?: (arg: number) => void
}) {
  return str.split('').map((d, i) => (
    <span
      key={`${d}-${i}`}
      onMouseOver={() => onMouseOver?.(i)}
      onClick={() => onClick?.(i)}
      style={{
        background:
          hoveredPosition !== undefined && i === hoveredPosition
            ? '#f698'
            : gapSet?.has(i) && showHighlight
              ? '#33ff19'
              : undefined,
      }}
    >
      {d === ' ' ? <>&nbsp;</> : d}
    </span>
  ))
}
