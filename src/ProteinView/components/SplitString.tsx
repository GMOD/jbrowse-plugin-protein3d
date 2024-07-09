import React from 'react'

export default function SplitString({
  str,
  col,
  set,
  onMouseOver,
  onClick,
  showHighlight,
}: {
  str: string
  col?: number
  set?: Set<number>
  onMouseOver?: (arg: number) => void
  onClick?: (arg: number) => void
  showHighlight: boolean
}) {
  return str.split('').map((d, i) => (
    <span
      key={`${d}-${i}`}
      onMouseOver={() => onMouseOver?.(i)}
      onClick={() => onClick?.(i)}
      style={{
        background:
          col !== undefined && i === col
            ? '#f698'
            : set?.has(i) && showHighlight
              ? '#33ff19'
              : undefined,
      }}
    >
      {d === ' ' ? <>&nbsp;</> : d}
    </span>
  ))
}
