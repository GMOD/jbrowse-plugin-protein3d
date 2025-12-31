import React, { useState } from 'react'

import { Tooltip, Typography } from '@mui/material'
import { observer } from 'mobx-react'

import highlightResidueRange from '../highlightResidueRange'
import useUniProtFeatures, {
  UniProtFeature,
  getFeatureColor,
} from '../hooks/useUniProtFeatures'
import { JBrowsePluginProteinStructureModel } from '../model'

const CHAR_WIDTH = 6
const TRACK_HEIGHT = 12
const TRACK_GAP = 2

type FeaturesByType = Record<string, UniProtFeature[]>

function groupFeaturesByType(features: UniProtFeature[]): FeaturesByType {
  const grouped: FeaturesByType = {}
  for (const feature of features) {
    grouped[feature.type] ??= []
    grouped[feature.type]!.push(feature)
  }
  return grouped
}

const FeatureBar = observer(function FeatureBar({
  feature,
  model,
  offsetLeft,
}: {
  feature: UniProtFeature
  model: JBrowsePluginProteinStructureModel
  offsetLeft: number
}) {
  const [isHovered, setIsHovered] = useState(false)
  const {
    transcriptSeqToStructureSeqPosition,
    molstarPluginContext,
    molstarStructure,
  } = model

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (
      !molstarPluginContext ||
      !molstarStructure ||
      !transcriptSeqToStructureSeqPosition
    ) {
      return
    }

    const structStart = transcriptSeqToStructureSeqPosition[feature.start - 1]
    const structEnd = transcriptSeqToStructureSeqPosition[feature.end - 1]

    if (structStart !== undefined && structEnd !== undefined) {
      highlightResidueRange({
        structure: molstarStructure,
        startResidue: structStart + 1,
        endResidue: structEnd + 1,
        plugin: molstarPluginContext,
      })
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    molstarPluginContext?.managers.interactivity.lociHighlights.clearHighlights()
  }

  const handleClick = () => {
    if (
      !molstarPluginContext ||
      !molstarStructure ||
      !transcriptSeqToStructureSeqPosition
    ) {
      return
    }

    const structStart = transcriptSeqToStructureSeqPosition[feature.start - 1]
    const structEnd = transcriptSeqToStructureSeqPosition[feature.end - 1]

    if (structStart !== undefined && structEnd !== undefined) {
      highlightResidueRange({
        structure: molstarStructure,
        startResidue: structStart + 1,
        endResidue: structEnd + 1,
        plugin: molstarPluginContext,
      })
    }
  }

  const left = (feature.start - 1) * CHAR_WIDTH + offsetLeft
  const width = Math.max((feature.end - feature.start + 1) * CHAR_WIDTH, 3)
  const color = getFeatureColor(feature.type)

  return (
    <Tooltip
      title={
        <div>
          <div>
            <strong>{feature.type}</strong>
          </div>
          <div>
            Position: {feature.start}-{feature.end}
          </div>
          {feature.description ? <div>{feature.description}</div> : null}
        </div>
      }
    >
      <div
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          position: 'absolute',
          left,
          top: 0,
          width,
          height: TRACK_HEIGHT,
          backgroundColor: color,
          opacity: isHovered ? 1 : 0.8,
          cursor: 'pointer',
          borderRadius: 2,
          border: isHovered ? '1px solid black' : 'none',
          boxSizing: 'border-box',
        }}
      />
    </Tooltip>
  )
})

const FeatureTypeTrack = observer(function FeatureTypeTrack({
  type,
  features,
  model,
  sequenceLength,
  offsetLeft,
}: {
  type: string
  features: UniProtFeature[]
  model: JBrowsePluginProteinStructureModel
  sequenceLength: number
  offsetLeft: number
}) {
  const trackWidth = sequenceLength * CHAR_WIDTH + offsetLeft

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', marginBottom: TRACK_GAP }}
    >
      <div
        style={{
          width: offsetLeft - 4,
          fontSize: 9,
          fontFamily: 'monospace',
          textAlign: 'right',
          paddingRight: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={type}
      >
        {type}
      </div>
      <div
        style={{
          position: 'relative',
          height: TRACK_HEIGHT,
          width: trackWidth - offsetLeft,
          backgroundColor: '#f5f5f5',
        }}
      >
        {features.map((feature, idx) => (
          <FeatureBar
            key={`${feature.type}-${feature.start}-${feature.end}-${idx}`}
            feature={feature}
            model={model}
            offsetLeft={0}
          />
        ))}
      </div>
    </div>
  )
})

const ProteinFeatureTrack = observer(function ProteinFeatureTrack({
  model,
  uniprotId,
}: {
  model: JBrowsePluginProteinStructureModel
  uniprotId: string | undefined
}) {
  const { features, isLoading, error } = useUniProtFeatures(uniprotId)
  const { pairwiseAlignment } = model

  if (!uniprotId) {
    return null
  }

  if (isLoading) {
    return (
      <Typography variant="body2" style={{ fontSize: 9, margin: 8 }}>
        Loading UniProt features...
      </Typography>
    )
  }

  if (error) {
    return (
      <Typography
        variant="body2"
        color="error"
        style={{ fontSize: 9, margin: 8 }}
      >
        Error loading features: {`${error}`}
      </Typography>
    )
  }

  if (!features || features.length === 0) {
    return null
  }

  if (!pairwiseAlignment) {
    return null
  }

  const sequenceLength = pairwiseAlignment.alns[0].seq.replace(/-/g, '').length
  const groupedFeatures = groupFeaturesByType(features)
  const offsetLeft = 50

  return (
    <div style={{ margin: 8, overflow: 'auto' }}>
      <Typography variant="body2" style={{ fontSize: 10, marginBottom: 4 }}>
        UniProt Features (click to highlight on structure)
      </Typography>
      <div style={{ minWidth: sequenceLength * CHAR_WIDTH + offsetLeft }}>
        {Object.entries(groupedFeatures).map(([type, typeFeatures]) => (
          <FeatureTypeTrack
            key={type}
            type={type}
            features={typeFeatures}
            model={model}
            sequenceLength={sequenceLength}
            offsetLeft={offsetLeft}
          />
        ))}
      </div>
    </div>
  )
})

export default ProteinFeatureTrack
