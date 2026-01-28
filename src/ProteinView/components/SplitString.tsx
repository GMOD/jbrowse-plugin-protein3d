import React, { useMemo, useRef } from 'react'

import { observer } from 'mobx-react'

import { throttle } from './throttle'

import type { JBrowsePluginProteinStructureModel } from '../model'

const CHAR_WIDTH = 6

const CharacterSpans = observer(function CharacterSpans({
  str,
}: {
  str: string
}) {
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

const MatchOverlays = observer(function MatchOverlays({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const { showHighlight, alignmentMatchSet } = model
  return !showHighlight || !alignmentMatchSet
    ? null
    : [...alignmentMatchSet].map(i => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: i * CHAR_WIDTH,
            top: 0,
            width: CHAR_WIDTH,
            height: '100%',
            background: '#33ff19a0',
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

  return !showHoverHighlight ? null : (
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

const RangeHoverHighlight = observer(function RangeHoverHighlight({
  model,
  strLength,
}: {
  model: JBrowsePluginProteinStructureModel
  strLength: number
}) {
  const { alignmentHoverRange } = model
  if (!alignmentHoverRange) {
    return null
  }
  const { start, end } = alignmentHoverRange
  const clampedStart = Math.max(0, start)
  const clampedEnd = Math.min(strLength - 1, end)
  if (clampedStart > clampedEnd) {
    return null
  }
  const width = (clampedEnd - clampedStart + 1) * CHAR_WIDTH

  return (
    <span
      style={{
        position: 'absolute',
        left: clampedStart * CHAR_WIDTH,
        top: 0,
        width,
        height: '100%',
        background: 'rgba(255, 165, 0, 0.4)',
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
    [str, model],
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
      <MatchOverlays model={model} />
      <CharacterSpans str={str} />
      <RangeHoverHighlight model={model} strLength={str.length} />
      <HoverHighlight model={model} strLength={str.length} />
    </span>
  )
})

export default SplitString
