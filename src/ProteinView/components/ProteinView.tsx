import React, { useState, useEffect, useRef } from 'react'
import { DefaultPluginSpec } from 'molstar/lib/mol-plugin/spec'
import { DefaultPluginUISpec } from 'molstar/lib/mol-plugin-ui/spec'
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { ParamDefinition } from 'molstar/lib/mol-util/param-definition'
import { CameraHelperParams } from 'molstar/lib/mol-canvas3d/helper/camera-helper'
import { ProteinViewModel } from '../stateModel'

const loadStructure = async ({
  pdbId,
  url,
  file,
  plugin,
}: {
  pdbId: string
  url: string
  file?: { type: string; filestring: string }
  plugin?: { clear: () => void; [key: string]: any }
}) => {
  if (!plugin) {
    return
  }
  plugin.clear()
  if (file) {
    const data = await plugin.builders.data.rawData({
      data: file.filestring,
    })
    const traj = await plugin.builders.structure.parseTrajectory(
      data,
      file.type,
    )
    await plugin.builders.structure.hierarchy.applyPreset(traj, 'default')
  } else {
    const structureUrl = url
      ? url
      : pdbId
      ? `https://files.rcsb.org/view/${pdbId}.cif`
      : undefined
    if (!structureUrl) {
      return
    }
    const data = await plugin.builders.data.download(
      { url: structureUrl },
      { state: { isGhost: true } },
    )
    let extension = structureUrl.split('.').pop()?.replace('cif', 'mmcif')
    if (extension?.includes('?'))
      extension = extension.substring(0, extension.indexOf('?'))
    const traj = await plugin.builders.structure.parseTrajectory(
      data,
      extension,
    )
    await plugin.builders.structure.hierarchy.applyPreset(traj, 'default')
  }
}

export default function ProteinView({ model }: { model: ProteinViewModel }) {
  const {
    useInterface,
    url = '',
    file,
    dimensions,
    className = '',
    showControls,
    showAxes,
  } = {} as {
    showControls?: boolean
    showAxes?: boolean
    className?: string
    dimensions?: { width: number; height: number }
    file?: { type: string; filestring: string }
    url?: string
    useInterface?: string
  }
  const [error, setError] = useState<unknown>()
  const pdbId = '1LOL'
  const parentRef = useRef(null)
  const canvasRef = useRef(null)
  const plugin = useRef<any>(null)

  useEffect(() => {
    ;(async () => {
      try {
        if (useInterface) {
          const spec = DefaultPluginUISpec()
          spec.layout = {
            initial: {
              isExpanded: false,
              controlsDisplay: 'reactive',
              showControls,
            },
          }
          // molstar-react used createPluginAsync but export must have changed
          // plugin.current = await createPluginAsync(parentRef.current, spec)
        } else {
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
        await loadStructure({ pdbId, url, file, plugin: plugin.current })
      } catch (e) {
        setError(e)
      }
    })()
    return () => {
      plugin.current = null
    }
  }, [])

  useEffect(() => {
    loadStructure({ pdbId, url, file, plugin: plugin.current })
  }, [pdbId, url, file])

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

  const width = 800 //dimensions ? dimensions[0] : '100%'
  const height = 600 //dimensions ? dimensions[1] : '100%'
  console.log({ dimensions, width, height })

  if (error) {
    return <div style={{ color: 'red' }}>{`${error}`}</div>
  } else if (useInterface) {
    return (
      <div style={{ position: 'absolute', width, height, overflow: 'hidden' }}>
        <div
          ref={parentRef}
          style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }}
        />
      </div>
    )
  } else {
    return (
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
    )
  }
}
