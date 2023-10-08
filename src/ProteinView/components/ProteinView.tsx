import React, { useState, useEffect, useRef } from 'react'
import { observer } from 'mobx-react'
import { ErrorMessage } from '@jbrowse/core/ui'
import { doesIntersect2 } from '@jbrowse/core/util'
// molstar
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { ParamDefinition } from 'molstar/lib/mol-util/param-definition'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { CameraHelperParams } from 'molstar/lib/mol-canvas3d/helper/camera-helper'

// locals
import { ProteinViewModel } from '../model'
import { loadStructure } from './util'

// based on https://github.com/samirelanduk/molstar-react v0.5.1
// licensed ISC

const ProteinView = observer(function ({ model }: { model: ProteinViewModel }) {
  const { url, mapping } = model
  const {
    file,
    dimensions = { width: 800, height: 600 },
    className = '',
    showInterface = false,
    showControls = true,
    showAxes = true,
  } = {} as {
    showControls?: boolean
    showAxes?: boolean
    showInterface?: boolean
    className?: string
    dimensions?: { width: number; height: number }
    file?: { type: string; filestring: string }
  }

  const initializingRef = useRef(false)
  const [error, setError] = useState<unknown>()
  const [mouseClickedPosition, setMouseClickedPosition] = useState<string>()
  const parentRef = useRef(null)
  const canvasRef = useRef(null)
  const [plugin, setPlugin] = useState<PluginContext>()

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        console.log('lol')
        let p: PluginContext | undefined
        if (showInterface) {
          if (!parentRef.current) {
            return
          }
          p = await createPluginUI(parentRef.current, {
            ...DefaultPluginUISpec(),
            layout: {
              initial: {
                isExpanded: false,
                controlsDisplay: 'reactive',
                showControls,
              },
            },
          })
          setPlugin(p)
        } else {
          if (!canvasRef.current || !parentRef.current) {
            return
          }
          p = new PluginContext(DefaultPluginSpec())
          p.initViewer(canvasRef.current, parentRef.current)
          await p.init()
          setPlugin(p)
        }

        console.log('here')
        await loadStructure({ url, file, plugin: p })
        console.log('here2')
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()

    // needs review
  }, [url, file, showAxes, showInterface, showControls])

  // useEffect(() => {
  //   console.log('wow')
  //   // eslint-disable-next-line @typescript-eslint/no-floating-promises
  //   ;(async () => {
  //     if (!initialized) {
  //       return
  //     }
  //     try {
  //       await loadStructure({ url, file, plugin: plugin.current })
  //     } catch (e) {
  //       setError(e)
  //     }
  //   })()
  // }, [url, initialized, file])

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
      const clickedPos =
        plugin.state.getSnapshot().structureFocus?.current?.label
      setMouseClickedPosition(clickedPos)
      if (clickedPos) {
        const [root] = clickedPos.split('|')
        if (root) {
          const [, position] = root.trim().split(' ')
          const pos = +position.trim()
          const overlap = mapping
            ?.split('\n')
            .map(parse => {
              const [r1, r2] = parse.split('\t')
              const [refName, crange] = r1.trim().split(':')
              const [cstart, cend] = crange.trim().split('-')
              const [pdb, prange] = r2.trim().split(':')
              const [pstart, pend] = prange.trim().split('-')
              return {
                refName,
                pdb,
                cstart: +cstart.replaceAll(',', ''),
                cend: +cend.replaceAll(',', ''),
                pstart: +pstart.replaceAll(',', ''),
                pend: +pend.replaceAll(',', ''),
              }
            })
            .find(f => doesIntersect2(f.pstart, f.pend, pos, pos + 1))
          if (overlap) {
            const poffset = pos - overlap.pstart
            const coffset = overlap.cstart + poffset * 3

            model.setHighlights([
              {
                assemblyName: 'hg38',
                refName: overlap.refName,
                start: coffset,
                end: coffset + 3,
              },
            ])
          }
        }
      }
    })
    // plugin.canvas3d?.input.move.subscribe(_obj => {
    // const { x, y } = obj
    // const pickingId = plugin.current?.canvas3d?.identify(x, y)
    // const r =
    //   plugin.current?.managers.structure.hierarchy.current.structures[0]?.cell
    //     .obj?.data
    // if (r) {
    //   const r2 = Structure.toStructureElementLoci(r)
    //   console.log({ pickingId, r, r2 })
    // }
    //todo: Gets the current source data, return:[40.5922,17.4164,12.4629]
    // const getPickingSourceData = getPickingSourceData(pickingId)
    ////todo: Finding Associated Data，return :[43.4349,13.9762,16.5152]
    //const associatedData = findAssociatedData(getPickingSourceData)
    //const anotherPickingId = Structure.toStructureElementLoci(associatedData)
    //this.plugin.managers.camera.focusLoci(anotherPickingId)
    // })
    // needs review
  }, [plugin, mapping, model])

  const width = dimensions.width
  const height = dimensions.height

  if (error) {
    return <ErrorMessage error={error} />
  } else if (showInterface) {
    return (
      <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
        <div
          ref={parentRef}
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        />
      </div>
    )
  } else {
    return (
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
  }
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
