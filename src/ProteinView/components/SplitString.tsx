import React from 'react'

import { observer } from 'mobx-react'

import { MATCH_COLOR } from '../constants'
import { positionRuns } from '../residueRanges'

import type { JBrowsePluginProteinStructureModel } from '../model'

export const MatchOverlays = observer(function MatchOverlays({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const { showHighlight, alignmentMatchSet, columnWidth } = model
  return !showHighlight || !alignmentMatchSet
    ? null
    : positionRuns(alignmentMatchSet).map(run => (
        <span
          key={run.start}
          style={{
            position: 'absolute',
            left: run.start * columnWidth,
            top: 0,
            bottom: 0,
            width: (run.end - run.start) * columnWidth,
            background: MATCH_COLOR,
            pointerEvents: 'none',
          }}
        />
      ))
})

const SplitString = observer(function SplitString({
  model,
  str,
}: {
  model: JBrowsePluginProteinStructureModel
  str: string
}) {
  const { columnWidth } = model
  return str.split('').map((char, i) => (
    <span
      key={i}
      style={{
        position: 'absolute',
        left: i * columnWidth,
        width: columnWidth,
      }}
    >
      {char === ' ' ? '\u00A0' : char}
    </span>
  ))
})

export default SplitString
