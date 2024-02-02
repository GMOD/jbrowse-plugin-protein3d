import React, { useState, useEffect, useRef } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage } from '@jbrowse/core/ui'
// molstar
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { ParamDefinition } from 'molstar/lib/mol-util/param-definition'
import { CameraHelperParams } from 'molstar/lib/mol-canvas3d/helper/camera-helper'

import './molstar.css'

// locals
import { ProteinViewModel } from '../model'
import { loadStructure } from './util'
import { doesIntersect2, getSession } from '@jbrowse/core/util'
import { LinearGenomeViewModel } from '@jbrowse/plugin-linear-genome-view'

const proteinAbbreviationMapping = Object.fromEntries(
  [
    { name: 'alanine', abbreviation: 'Ala', singleLetterCode: 'A' },
    { name: 'arginine', abbreviation: 'Arg', singleLetterCode: 'R' },
    { name: 'asparagine', abbreviation: 'Asn', singleLetterCode: 'N' },
    { name: 'aspartic acid', abbreviation: 'Asp', singleLetterCode: 'D' },
    { name: 'cysteine', abbreviation: 'Cys', singleLetterCode: 'C' },
    { name: 'glutamic acid', abbreviation: 'Glu', singleLetterCode: 'E' },
    { name: 'glutamine', abbreviation: 'Gln', singleLetterCode: 'Q' },
    { name: 'glycine', abbreviation: 'Gly', singleLetterCode: 'G' },
    { name: 'histidine', abbreviation: 'His', singleLetterCode: 'H' },
    { name: 'isoleucine', abbreviation: 'Ile', singleLetterCode: 'I' },
    { name: 'leucine', abbreviation: 'Leu', singleLetterCode: 'L' },
    { name: 'lysine', abbreviation: 'Lys', singleLetterCode: 'K' },
    { name: 'methionine', abbreviation: 'Met', singleLetterCode: 'M' },
    { name: 'phenylalanine', abbreviation: 'Phe', singleLetterCode: 'F' },
    { name: 'proline', abbreviation: 'Pro', singleLetterCode: 'P' },
    { name: 'serine', abbreviation: 'Ser', singleLetterCode: 'S' },
    { name: 'threonine', abbreviation: 'Thr', singleLetterCode: 'T' },
    { name: 'tryptophan', abbreviation: 'Trp', singleLetterCode: 'W' },
    { name: 'tyrosine', abbreviation: 'Tyr', singleLetterCode: 'Y' },
    { name: 'valine', abbreviation: 'Val', singleLetterCode: 'V' },
  ].map(r => [r.abbreviation.toUpperCase(), r]),
)

const ProteinView = observer(function ({ model }: { model: ProteinViewModel }) {
  const { url, mapping } = model
  const {
    file,
    dimensions = { width: 800, height: 500 },
    className = '',
    showControls = true,
    showAxes = true,
  } = {} as {
    showControls?: boolean
    showAxes?: boolean
    className?: string
    dimensions?: { width: number; height: number }
    file?: { type: string; filestring: string }
  }

  const session = getSession(model)
  const [error, setError] = useState<unknown>()
  const [mouseClickedPosition, setMouseClickedPosition] = useState<string>()
  const parentRef = useRef(null)
  const canvasRef = useRef(null)
  const [plugin, setPlugin] = useState<PluginContext>()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (!canvasRef.current || !parentRef.current) {
          return
        }
        const r = DefaultPluginSpec()
        console.log({ r })
        const p = new PluginContext(DefaultPluginSpec())
        p.initViewer(canvasRef.current, parentRef.current)
        await p.init()
        setPlugin(p)

        await loadStructure({ url, file, plugin: p })
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()

    // needs review
  }, [url, file, showAxes, showControls])

  useEffect(() => {
    if (!plugin) {
      return
    }
    if (showAxes) {
      plugin.canvas3d?.setProps({
        camera: {
          helper: {
            axes: ParamDefinition.getDefaultValues(CameraHelperParams).axes,
          },
        },
      })
    } else {
      plugin.canvas3d?.setProps({
        camera: {
          helper: {
            axes: {
              name: 'off',
              params: {},
            },
          },
        },
      })
    }
  }, [plugin, showAxes])

  useEffect(() => {
    if (!plugin) {
      return
    }

    plugin.state.data.events.changed.subscribe(() => {
      try {
        const clickedLabel =
          plugin.state.getSnapshot().structureFocus?.current?.label

        if (clickedLabel) {
          const [clickPos, chain] = clickedLabel?.split('|') ?? []
          const [code, position] = clickPos.trim().split(' ')
          const pos = +position.trim()
          setMouseClickedPosition(
            `Position: ${pos}, Letter: ${code} (${proteinAbbreviationMapping[code]?.singleLetterCode}), Chain: ${chain}`,
          )
          for (const entry of mapping) {
            const {
              featureStart,
              featureEnd,
              refName,
              proteinStart,
              proteinEnd,
              strand,
            } = entry
            const c = pos - 1
            if (doesIntersect2(proteinStart, proteinEnd, c, c + 1)) {
              const ret = Math.round((c - proteinStart) * 3)
              const start =
                strand === -1 ? featureEnd - ret : featureStart + ret
              const end =
                strand === -1 ? featureEnd - ret - 3 : featureStart + ret + 3
              const [s1, s2] = [Math.min(start, end), Math.max(start, end)]
              console.log({ s1, s2, pos })

              model.setHighlights([
                {
                  assemblyName: 'hg38',
                  refName,
                  start: s1,
                  end: s2,
                },
              ])
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              ;(session.views[0] as LinearGenomeViewModel).navToLocString(
                `${refName}:${s1}-${s2}`,
              )
            }
          }
        } else {
          setMouseClickedPosition(undefined)
        }
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })
  }, [plugin, mapping, session, model])

  const width = dimensions.width
  const height = dimensions.height

  return error ? (
    <ErrorMessage error={error} />
  ) : (
    <div>
      {mouseClickedPosition}
      <div
        ref={parentRef}
        style={{ position: 'relative', width, height }}
        className={className}
      >
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', top: 0, left: 0 }}
        />
      </div>
    </div>
  )
})

const Wrapper = observer(function ({ model }: { model: ProteinViewModel }) {
  const { url } = model
  return (
    <div>
      <div>{url}</div>
      <ProteinView model={model} />
    </div>
  )
})

export default Wrapper
