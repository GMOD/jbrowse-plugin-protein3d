import React, { useState, useEffect, useRef } from 'react'
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { ParamDefinition } from 'molstar/lib/mol-util/param-definition'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { Structure } from 'molstar/lib/mol-model/structure/structure'
import { CameraHelperParams } from 'molstar/lib/mol-canvas3d/helper/camera-helper'
import { ProteinViewModel } from '../stateModel'

import { loadStructure } from './util'
import { observer } from 'mobx-react'
import { ErrorMessage } from '@jbrowse/core/ui'

// based on https://github.com/samirelanduk/molstar-react v0.5.1
// licensed ISC

const ProteinView = observer(function ({ model }: { model: ProteinViewModel }) {
  const { url } = model
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

  const [error, setError] = useState<unknown>()
  const [mouseover, setMouseover] = useState<string>()
  const parentRef = useRef(null)
  const canvasRef = useRef(null)
  const plugin = useRef<PluginContext>()

  useEffect(() => {
    ;(async () => {
      try {
        if (showInterface) {
          if (!parentRef.current) {
            return
          }
          plugin.current = await createPluginUI(parentRef.current, {
            ...DefaultPluginUISpec(),
            layout: {
              initial: {
                isExpanded: false,
                controlsDisplay: 'reactive',
                showControls,
              },
            },
          })
        } else {
          if (!canvasRef.current || !parentRef.current) {
            return
          }
          plugin.current = new PluginContext(DefaultPluginSpec())
          plugin.current.initViewer(canvasRef.current, parentRef.current)
          await plugin.current.init()
        }
        if (!showAxes) {
          plugin.current.canvas3d?.setProps({
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
        await loadStructure({ url, file, plugin: plugin.current })
      } catch (e) {
        setError(e)
      }
    })()
    return () => {
      plugin.current = undefined
    }
    // needs review
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadStructure({ url, file, plugin: plugin.current })
  }, [url, file])

  useEffect(() => {
    if (!plugin.current) {
      return
    }
    if (!showAxes) {
      plugin.current.canvas3d?.setProps({
        camera: {
          helper: {
            axes: {
              name: 'off',
              params: {},
            },
          },
        },
      })
    } else {
      plugin.current.canvas3d?.setProps({
        camera: {
          helper: {
            axes: ParamDefinition.getDefaultValues(CameraHelperParams).axes,
          },
        },
      })
    }
  }, [showAxes])

  useEffect(() => {
    plugin.current?.state.data.events.changed.subscribe(() => {
      setMouseover(
        plugin.current?.state.getSnapshot().structureFocus?.current?.label,
      )
    })
    plugin.current?.canvas3d?.input.move.subscribe((obj) => {
      const { x, y } = obj
      const pickingId = plugin.current?.canvas3d?.identify(x, y)
      const r =
        plugin.current?.managers.structure.hierarchy.current.structures[0]?.cell
          .obj?.data
      if (r) {
        const r2 = Structure.toStructureElementLoci(r)
        console.log({ pickingId, r, r2 })
      }

      //todo: Gets the current source data, return:[40.5922,17.4164,12.4629]
      // const getPickingSourceData = getPickingSourceData(pickingId)
      ////todo: Finding Associated Data，return :[43.4349,13.9762,16.5152]
      //const associatedData = findAssociatedData(getPickingSourceData)
      //const anotherPickingId = Structure.toStructureElementLoci(associatedData)
      //this.plugin.managers.camera.focusLoci(anotherPickingId)
    })
  }, [])

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
        {mouseover || 'No click'}
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

export default observer(function ({ model }: { model: ProteinViewModel }) {
  return (
    <div>
      <div>{model.url}</div>
      <ProteinView model={model} />
    </div>
  )
})
