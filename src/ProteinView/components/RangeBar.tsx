import React, { useState } from 'react'

import { Tooltip } from '@mui/material'
import { observer } from 'mobx-react'

import { HOVERED_BORDER, SELECTED_BORDER } from '../constants'

import type { JBrowsePluginProteinStructureModel } from '../model'

/** `248` for one residue, `245-250` for several */
export function rangeText(first: number, last: number) {
  return first === last ? `${first}` : `${first}-${last}`
}

/**
 * One bar over a run of alignment columns, `alignmentEnd` inclusive: a UniProt
 * feature or an alignment domain. Hovering or focusing it lights its columns,
 * and a click, Enter or Space does what `onClick` says.
 */
const RangeBar = observer(function RangeBar({
  alignmentStart,
  alignmentEnd,
  top,
  height,
  color,
  selected,
  tooltip,
  ariaLabel,
  dataAttributes,
  onClick,
  model,
}: {
  alignmentStart: number
  alignmentEnd: number
  top: number | string
  height: string
  color: string | undefined
  selected: boolean
  tooltip: React.ReactNode
  ariaLabel: string
  dataAttributes: Record<`data-${string}`, string | number | undefined>
  onClick: () => void
  model: JBrowsePluginProteinStructureModel
}) {
  const [isHovered, setIsHovered] = useState(false)
  const { columnWidth } = model
  const enter = () => {
    setIsHovered(true)
    model.setAlignmentHoverRange({ start: alignmentStart, end: alignmentEnd })
  }
  const leave = () => {
    setIsHovered(false)
    model.setAlignmentHoverRange(undefined)
  }
  return (
    <Tooltip title={tooltip} followCursor>
      <div
        {...dataAttributes}
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-pressed={selected}
        onClick={onClick}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onClick()
          }
        }}
        onMouseEnter={enter}
        onMouseLeave={leave}
        onFocus={enter}
        onBlur={leave}
        style={{
          position: 'absolute',
          left: alignmentStart * columnWidth,
          top,
          width: (alignmentEnd - alignmentStart + 1) * columnWidth,
          height,
          backgroundColor: color,
          opacity: isHovered || selected ? 0.9 : 0.6,
          cursor: 'pointer',
          borderRadius: 2,
          border: selected
            ? SELECTED_BORDER
            : isHovered
              ? HOVERED_BORDER
              : 'none',
          boxSizing: 'border-box',
        }}
      />
    </Tooltip>
  )
})

export default RangeBar
