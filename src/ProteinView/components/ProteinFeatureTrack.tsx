import React, { useState } from 'react'

import { Tooltip, Typography } from '@mui/material'
import { getCodonRange } from 'g2p_mapper'
import { observer } from 'mobx-react'

import highlightResidueRange, {
  selectResidueRange,
} from '../highlightResidueRange'
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
    structureSeqToTranscriptSeqPosition,
    genomeToTranscriptSeqMapping,
    connectedView,
    molstarPluginContext,
  } = model

  const highlightGenomeRange = () => {
    if (!genomeToTranscriptSeqMapping || !structureSeqToTranscriptSeqPosition) {
      return
    }
    const { p2g, strand, refName } = genomeToTranscriptSeqMapping
    const assemblyName = connectedView?.assemblyNames[0]
    if (!assemblyName) {
      return
    }

    const highlights = []
    for (let pos = feature.start - 1; pos < feature.end; pos++) {
      const transcriptPos = structureSeqToTranscriptSeqPosition[pos]
      if (transcriptPos !== undefined) {
        const coords = getCodonRange(p2g, transcriptPos, strand)
        if (coords) {
          highlights.push({
            assemblyName,
            refName,
            start: coords[0],
            end: coords[1],
          })
        }
      }
    }

    if (highlights.length > 0) {
      const minStart = Math.min(...highlights.map(h => h.start))
      const maxEnd = Math.max(...highlights.map(h => h.end))
      model.setHoverGenomeHighlights([
        {
          assemblyName,
          refName,
          start: minStart,
          end: maxEnd,
        },
      ])
    }
  }

  // UniProt features are already in structure coordinates (1-based)
  const getStructureRange = () => {
    return {
      start: feature.start,
      end: feature.end,
    }
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (!molstarPluginContext) {
      return
    }

    // Get structure directly from hierarchy (same as working code in structureModel)
    const structure =
      molstarPluginContext.managers.structure.hierarchy.current.structures[0]
        ?.cell.obj?.data
    if (!structure) {
      console.log('No structure available in Molstar hierarchy')
      return
    }

    const range = getStructureRange()
    highlightResidueRange({
      structure,
      startResidue: range.start,
      endResidue: range.end,
      plugin: molstarPluginContext,
    })

    highlightGenomeRange()
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    molstarPluginContext?.managers.interactivity.lociHighlights.clearHighlights()
    model.clearHoverGenomeHighlights()
  }

  const handleClick = () => {
    if (!molstarPluginContext) {
      return
    }

    const structure =
      molstarPluginContext.managers.structure.hierarchy.current.structures[0]
        ?.cell.obj?.data
    if (!structure) {
      return
    }

    const range = getStructureRange()
    selectResidueRange({
      structure,
      startResidue: range.start,
      endResidue: range.end,
      plugin: molstarPluginContext,
    })
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
          opacity: isHovered ? 0.9 : 0.6,
          cursor: 'pointer',
          borderRadius: 2,
          border: isHovered ? '1px solid black' : 'none',
          boxSizing: 'border-box',
        }}
      />
    </Tooltip>
  )
})

const HoverMarker = observer(function HoverMarker({
  model,
  offsetLeft,
}: {
  model: JBrowsePluginProteinStructureModel
  offsetLeft: number
}) {
  const { structureSeqHoverPos, structureSeqToTranscriptSeqPosition } = model

  if (structureSeqHoverPos === undefined) {
    return null
  }

  // Convert structure position to transcript position for display
  const transcriptPos =
    structureSeqToTranscriptSeqPosition?.[structureSeqHoverPos]
  if (transcriptPos === undefined) {
    return null
  }

  const left = transcriptPos * CHAR_WIDTH + offsetLeft

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: 0,
        bottom: 0,
        width: CHAR_WIDTH,
        backgroundColor: 'rgba(255, 105, 180, 0.5)',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
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
        <HoverMarker model={model} offsetLeft={0} />
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
  // Match the "GENOME " label width (7 chars * 6px)
  const offsetLeft = 42

  return (
    <div style={{ marginTop: 8 }}>
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
