import React from 'react'

import { observer } from 'mobx-react'

import type {
  JBrowsePluginProteinStructureModel,
  JBrowsePluginProteinViewModel,
} from '../model'

const HeaderStructureInfo = observer(function HeaderStructureInfo({
  model,
}: {
  model: JBrowsePluginProteinViewModel
}) {
  const { structures } = model
  // With several structures open a hover lights the same residue on each, so
  // every readout is prefixed with the structure it describes.
  const hoverText = structures
    .filter((s: JBrowsePluginProteinStructureModel) => !!s.hoverString)
    .map((s: JBrowsePluginProteinStructureModel) =>
      structures.length > 1 && s.label
        ? `${s.label}: ${s.hoverString}`
        : s.hoverString,
    )
    .join(' | ')
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontSize: 12,
      }}
      title={hoverText}
    >
      {/* nbsp keeps the line height stable when there is no hover */}
      {hoverText ? `Hover: ${hoverText}` : ' '}
    </div>
  )
})

export default HeaderStructureInfo
