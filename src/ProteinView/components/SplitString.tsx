import React, { useMemo, useRef } from 'react'

import { observer } from 'mobx-react'

import type { JBrowsePluginProteinStructureModel } from '../model'

const CHAR_WIDTH = 6

function throttle<T extends (...args: Parameters<T>) => void>(
  func: T,
  limit: number,
): T {
  let lastCall = 0
  return ((...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= limit) {
      lastCall = now
      func(...args)
    }
  }) as T
}

const CharacterSpans = observer(function CharacterSpans({ str }: { str: string }) {
  return str.split('').map((char, i) => (
    <span
      key={i}
      style={{
        position: 'absolute',
        left: i * CHAR_WIDTH,
        width: CHAR_WIDTH,
      }}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  ))
})

const GapOverlays = observer(function GapOverlays({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const { showHighlight, alignmentGapSet } = model
  if (!showHighlight || !alignmentGapSet) {
    return null
  }
  return [...alignmentGapSet].map(i => (
    <span
      key={i}
      style={{
        position: 'absolute',
        left: i * CHAR_WIDTH,
        top: 0,
        width: CHAR_WIDTH,
        height: '100%',
        background: '#33ff19',
        pointerEvents: 'none',
      }}
    />
  ))
})

const HoverHighlight = observer(function HoverHighlight({
  model,
  strLength,
}: {
  model: JBrowsePluginProteinStructureModel
  strLength: number
}) {
  const { alignmentHoverPos } = model
  const showHoverHighlight =
    alignmentHoverPos !== undefined &&
    alignmentHoverPos >= 0 &&
    alignmentHoverPos < strLength

  if (!showHoverHighlight) {
    return null
  }
  return (
    <span
      style={{
        position: 'absolute',
        left: alignmentHoverPos * CHAR_WIDTH,
        top: 0,
        width: CHAR_WIDTH,
        height: '100%',
        background: '#f698',
        pointerEvents: 'none',
      }}
    />
  )
})

const SplitString = observer(function SplitString({
  model,
  str,
}: {
  model: JBrowsePluginProteinStructureModel
  str: string
}) {
  const containerRef = useRef<HTMLSpanElement>(null)

  const handleMouseMove = useMemo(
    () =>
      throttle((e: React.MouseEvent) => {
        const container = containerRef.current
        if (!container) {
          return
        }
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left
        const index = Math.floor(x / CHAR_WIDTH)
        if (index >= 0 && index < str.length) {
          model.hoverAlignmentPosition(index)
        }
      }, 16),
    [str.length, model],
  )

  const handleClick = useMemo(
    () => (e: React.MouseEvent) => {
      const container = containerRef.current
      if (!container) {
        return
      }
      const rect = container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const index = Math.floor(x / CHAR_WIDTH)
      if (index >= 0 && index < str.length) {
        model.clickAlignmentPosition(index)
      }
    },
    [str.length, model],
  )

  return (
    <span
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'inline-block',
        width: str.length * CHAR_WIDTH,
        height: '1em',
      }}
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    >
      <CharacterSpans str={str} />
      <GapOverlays model={model} />
      <HoverHighlight model={model} strLength={str.length} />
    </span>
  )
})

export default SplitString
