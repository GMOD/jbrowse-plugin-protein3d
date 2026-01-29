import React, { useState } from 'react'

import { Tooltip } from '@mui/material'
import { observer } from 'mobx-react'

import {
  CHAR_WIDTH,
  HIDE_BUTTON_COLOR,
  HOVERED_BORDER,
  HOVER_MARKER_COLOR,
  SELECTED_BORDER,
  TRACK_GAP,
  TRACK_HEIGHT,
} from '../constants'
import highlightResidueRange, {
  selectResidueRange,
} from '../highlightResidueRange'
import { FeatureTrackData } from '../hooks/useProteinFeatureTrackData'
import { UniProtFeature, getFeatureColor } from '../hooks/useUniProtFeatures'
import { JBrowsePluginProteinStructureModel } from '../model'
import {
  clickProteinToGenome,
  proteinRangeToGenomeMapping,
} from '../proteinToGenomeMapping'

function getVisibleTypes(
  featureTypes: string[],
  hiddenFeatureTypes: Set<string>,
) {
  return featureTypes.filter(type => !hiddenFeatureTypes.has(type))
}

function getFeatureGeometry(feature: UniProtFeature) {
  return {
    left: (feature.start - 1) * CHAR_WIDTH,
    width: Math.max((feature.end - feature.start + 1) * CHAR_WIDTH, 3),
  }
}

function FeatureTooltipContent({ feature }: { feature: UniProtFeature }) {
  return (
    <div>
      <div>
        <strong>{feature.type}</strong>
      </div>
      <div>
        Position: {feature.start}-{feature.end}
      </div>
      {feature.description ? <div>{feature.description}</div> : null}
    </div>
  )
}

const FeatureBar = observer(function FeatureBar({
  feature,
  model,
}: {
  feature: UniProtFeature
  model: JBrowsePluginProteinStructureModel
}) {
  const [isHovered, setIsHovered] = useState(false)
  const {
    genomeToTranscriptSeqMapping,
    connectedView,
    molstarPluginContext,
    selectedFeatureId,
    structurePositionToAlignmentMap,
  } = model
  const isSelected = selectedFeatureId === feature.uniqueId

  const getAlignmentRange = () => {
    if (!structurePositionToAlignmentMap) {
      return undefined
    }
    const startAlignmentPos = structurePositionToAlignmentMap[feature.start - 1]
    const endAlignmentPos = structurePositionToAlignmentMap[feature.end - 1]
    if (startAlignmentPos !== undefined && endAlignmentPos !== undefined) {
      return { start: startAlignmentPos, end: endAlignmentPos }
    }
    return undefined
  }

  const handleMouseEnter = () => {
    setIsHovered(true)
    const structure = model.molstarStructure
    if (structure && molstarPluginContext) {
      highlightResidueRange({
        structure,
        startResidue: feature.start,
        endResidue: feature.end,
        plugin: molstarPluginContext,
      })
    }
    const { refName } = genomeToTranscriptSeqMapping ?? {}
    const assemblyName = connectedView?.assemblyNames[0]
    if (refName && assemblyName) {
      const result = proteinRangeToGenomeMapping({
        model,
        structureSeqPos: feature.start - 1,
        structureSeqEndPos: feature.end,
      })
      if (result) {
        model.setHoverGenomeHighlights([
          {
            assemblyName,
            refName,
            start: result[0],
            end: result[1],
          },
        ])
      }
    }
    const range = getAlignmentRange()
    if (range) {
      model.setAlignmentHoverRange(range)
    }
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    molstarPluginContext?.managers.interactivity.lociHighlights.clearHighlights()
    model.clearHoverGenomeHighlights()
    model.clearAlignmentHoverRange()
  }

  const handleClick = () => {
    const structure = model.molstarStructure
    const newSelected = !isSelected

    if (structure && molstarPluginContext) {
      if (newSelected) {
        selectResidueRange({
          structure,
          startResidue: feature.start,
          endResidue: feature.end,
          plugin: molstarPluginContext,
        })
      } else {
        molstarPluginContext.managers.interactivity.lociSelects.deselectAll()
      }
    }

    if (newSelected) {
      model.setSelectedFeatureId(feature.uniqueId)
      const range = getAlignmentRange()
      if (range) {
        model.setClickAlignmentRange(range)
      }
      clickProteinToGenome({
        model,
        structureSeqPos: feature.start - 1,
        structureSeqEndPos: feature.end,
      }).catch((e: unknown) => {
        console.error(e)
      })
    } else {
      model.clearSelectedFeatureId()
      model.clearClickAlignmentRange()
      model.clearClickGenomeHighlights()
    }
  }

  const { left, width } = getFeatureGeometry(feature)
  const color = getFeatureColor(feature.type)

  return (
    <Tooltip title={<FeatureTooltipContent feature={feature} />}>
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
          opacity: isHovered || isSelected ? 0.9 : 0.6,
          cursor: 'pointer',
          borderRadius: 2,
          border: isSelected
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

const HoverMarker = observer(function HoverMarker({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const { structureSeqHoverPos, structureSeqToTranscriptSeqPosition } = model

  if (structureSeqHoverPos === undefined) {
    return null
  }

  const transcriptPos =
    structureSeqToTranscriptSeqPosition?.[structureSeqHoverPos]
  if (transcriptPos === undefined) {
    return null
  }

  const left = transcriptPos * CHAR_WIDTH

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top: 0,
        bottom: 0,
        width: CHAR_WIDTH,
        backgroundColor: HOVER_MARKER_COLOR,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  )
})

const FeatureTypeLabel = observer(function FeatureTypeLabel({
  type,
  labelWidth,
  model,
}: {
  type: string
  labelWidth: number
  model: JBrowsePluginProteinStructureModel
}) {
  return (
    <Tooltip title={type} placement="left">
      <div
        style={{
          height: TRACK_HEIGHT + TRACK_GAP,
          width: labelWidth - 4,
          fontSize: 9,
          fontFamily: 'monospace',
          textAlign: 'right',
          paddingRight: 4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 2,
        }}
      >
        <span
          onClick={e => {
            e.stopPropagation()
            model.hideFeatureType(type)
          }}
          style={{
            cursor: 'pointer',
            color: HIDE_BUTTON_COLOR,
            fontWeight: 'bold',
            fontSize: 8,
            lineHeight: 1,
          }}
          title={`Hide ${type} track`}
        >
          x
        </span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {type}
        </span>
      </div>
    </Tooltip>
  )
})

const FeatureTypeTrackContent = observer(function FeatureTypeTrackContent({
  features,
  model,
  sequenceLength,
}: {
  features: UniProtFeature[]
  model: JBrowsePluginProteinStructureModel
  sequenceLength: number
}) {
  const trackWidth = sequenceLength * CHAR_WIDTH

  return (
    <div
      style={{
        position: 'relative',
        height: TRACK_HEIGHT,
        width: trackWidth,
        marginBottom: TRACK_GAP,
      }}
    >
      {features.map(feature => (
        <FeatureBar key={feature.uniqueId} feature={feature} model={model} />
      ))}
      <HoverMarker model={model} />
    </div>
  )
})

export const ProteinFeatureTrackLabels = observer(
  function ProteinFeatureTrackLabels({
    data,
    labelWidth,
    model,
  }: {
    data: FeatureTrackData
    labelWidth: number
    model: JBrowsePluginProteinStructureModel
  }) {
    const { hiddenFeatureTypes } = model
    const visibleTypes = getVisibleTypes(data.featureTypes, hiddenFeatureTypes)
    return (
      <>
        {visibleTypes.map(type => (
          <FeatureTypeLabel
            key={type}
            type={type}
            labelWidth={labelWidth}
            model={model}
          />
        ))}
      </>
    )
  },
)

export const ProteinFeatureTrackContent = observer(
  function ProteinFeatureTrackContent({
    data,
    model,
  }: {
    data: FeatureTrackData
    model: JBrowsePluginProteinStructureModel
  }) {
    const { hiddenFeatureTypes } = model
    const visibleTypes = getVisibleTypes(data.featureTypes, hiddenFeatureTypes)
    return (
      <>
        {visibleTypes.map(type => (
          <FeatureTypeTrackContent
            key={type}
            features={data.groupedFeatures[type]!}
            model={model}
            sequenceLength={data.sequenceLength}
          />
        ))}
      </>
    )
  },
)
