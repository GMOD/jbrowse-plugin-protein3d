import React, { useCallback, useEffect, useRef } from 'react'

import { Tooltip, Typography } from '@mui/material'
import { reaction } from 'mobx'
import { observer } from 'mobx-react'

import { JBrowsePluginProteinStructureModel } from '../model'
import ProteinAlignmentHelpButton from './ProteinAlignmentHelpButton'
import {
  ProteinFeatureTrackContent,
  ProteinFeatureTrackLabels,
} from './ProteinFeatureTrack'
import SplitString from './SplitString'
import useProteinFeatureTrackData from '../hooks/useProteinFeatureTrackData'

const LABEL_WIDTH = 50
const ROW_HEIGHT = 14

const ProteinAlignment = observer(function ProteinAlignment({
  model,
}: {
  model: JBrowsePluginProteinStructureModel
}) {
  const {
    pairwiseAlignment,
    showHighlight,
    showProteinTracks,
    autoScrollAlignment,
    uniprotId,
  } = model
  const containerRef = useRef<HTMLDivElement>(null)
  const {
    data: featureData,
    isLoading: featureLoading,
    error: featureError,
  } = useProteinFeatureTrackData(model, uniprotId)

  useEffect(
    () =>
      reaction(
        () => model.alignmentHoverPos,
        alignmentHoverPos => {
          const container = containerRef.current
          if (
            !autoScrollAlignment ||
            model.isMouseInAlignment ||
            alignmentHoverPos === undefined ||
            !container
          ) {
            return
          }
          const charWidth = 6
          const scrollPosition = alignmentHoverPos * charWidth
          container.scrollTo({
            left: scrollPosition - container.clientWidth / 2,
            behavior: 'smooth',
          })
        },
      ),
    [model, autoScrollAlignment],
  )

  const handleContainerMouseEnter = useCallback(() => {
    model.setIsMouseInAlignment(true)
  }, [model])

  const handleContainerMouseLeave = useCallback(() => {
    model.setIsMouseInAlignment(false)
    model.setHoveredPosition(undefined)
    model.clearHoverGenomeHighlights()
    model.clearHighlightFromExternal()
  }, [model])

  if (!pairwiseAlignment) {
    return <div>No pairwiseAlignment</div>
  }

  const a0 = pairwiseAlignment.alns[0].seq
  const a1 = pairwiseAlignment.alns[1].seq
  const con = pairwiseAlignment.consensus

  return (
    <div>
      <ProteinAlignmentHelpButton model={model} />

      <Typography>
        Alignment of the protein structure file&apos;s sequence with the
        selected transcript&apos;s sequence.{' '}
        {showHighlight ? 'Green is the aligned portion' : null}
      </Typography>
      <div
        style={{
          display: 'flex',
          fontSize: 9,
          fontFamily: 'monospace',
          cursor: 'pointer',
          margin: 8,
          paddingBottom: 8,
        }}
        onMouseEnter={handleContainerMouseEnter}
        onMouseLeave={handleContainerMouseLeave}
      >
        <div
          style={{
            flexShrink: 0,
            width: LABEL_WIDTH,
            textAlign: 'right',
            paddingRight: 4,
          }}
        >
          <div style={{ height: ROW_HEIGHT }}>
            <Tooltip title="This is the sequence of the protein from the reference genome transcript">
              <span>GENOME</span>
            </Tooltip>
          </div>
          <div style={{ height: ROW_HEIGHT }}>&nbsp;</div>
          <div style={{ height: ROW_HEIGHT }}>
            <Tooltip title="This is the sequence of the protein from the structure file">
              <span>STRUCT</span>
            </Tooltip>
          </div>
          {showProteinTracks ? (
            featureLoading ? (
              <div style={{ height: ROW_HEIGHT, fontSize: 8, color: '#666' }}>
                Loading...
              </div>
            ) : featureError ? (
              <Tooltip
                title={
                  featureError instanceof Error
                    ? featureError.message
                    : 'Error loading features'
                }
              >
                <div style={{ height: ROW_HEIGHT, fontSize: 8, color: 'red' }}>
                  Error
                </div>
              </Tooltip>
            ) : featureData ? (
              <ProteinFeatureTrackLabels
                data={featureData}
                labelWidth={LABEL_WIDTH}
              />
            ) : null
          ) : null}
        </div>
        <div
          ref={containerRef}
          style={{
            overflow: 'auto',
            whiteSpace: 'nowrap',
            flex: 1,
            paddingBottom: 10,
            backgroundColor: 'white',
          }}
        >
          <div style={{ height: ROW_HEIGHT }}>
            <SplitString model={model} str={a0} />
          </div>
          <div style={{ height: ROW_HEIGHT }}>
            <SplitString model={model} str={con} />
          </div>
          <div style={{ height: ROW_HEIGHT }}>
            <SplitString model={model} str={a1} />
          </div>
          {showProteinTracks && featureData ? (
            <ProteinFeatureTrackContent data={featureData} model={model} />
          ) : null}
        </div>
      </div>
    </div>
  )
})

export default ProteinAlignment
