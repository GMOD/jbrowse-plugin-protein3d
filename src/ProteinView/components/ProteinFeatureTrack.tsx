import React from 'react'

import { observer } from 'mobx-react'

import FeatureBar from './FeatureBar'

import type { FeatureGroup } from '../hooks/useProteinFeatureTrackData'
import type { JBrowsePluginProteinStructureModel } from '../model'

const ProteinFeatureTrack = observer(function ProteinFeatureTrack({
  group,
  model,
}: {
  group: FeatureGroup
  model: JBrowsePluginProteinStructureModel
}) {
  const { selectedFeatureId, laneHeight } = model
  const expanded = model.expandedFeatureTypes.has(group.type)
  return group.layouts.map(layout => (
    <FeatureBar
      key={layout.feature.uniqueId}
      layout={layout}
      top={(expanded ? layout.lane : 0) * laneHeight}
      selected={selectedFeatureId === layout.feature.uniqueId}
      model={model}
    />
  ))
})

export default ProteinFeatureTrack
