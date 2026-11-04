import type loadMolstar from './loadMolstar'
import type { Camera } from 'molstar/lib/mol-canvas3d/camera'
import type { PluginContext } from 'molstar/lib/mol-plugin/context'

type Molstar = Awaited<ReturnType<typeof loadMolstar>>
type Triple = [number, number, number]

/**
 * A camera a session or figure fixes, in the structure's own coordinates:
 * where the eye sits, what it looks at and which way is up. `radius` clips
 * the scene to a slab that deep either side of the target, so a filament
 * seen down its axis shows one rung; `mode` defaults to perspective.
 */
export interface SavedCamera {
  position: Triple
  target: Triple
  up: Triple
  radius?: number
  mode?: Camera.Mode
}

export function applySavedCamera(
  plugin: PluginContext,
  molstar: Molstar,
  { position, target, up, radius, mode = 'perspective' }: SavedCamera,
) {
  const { Vec3 } = molstar
  plugin.canvas3d?.setProps({ camera: { mode, manualReset: true } })
  plugin.canvas3d?.requestCameraReset({
    snapshot: {
      mode,
      position: Vec3.create(...position),
      target: Vec3.create(...target),
      up: Vec3.create(...up),
      ...(radius === undefined
        ? {}
        : { radius, radiusMax: radius, clipFar: true, fog: 0 }),
    },
  })
}

function tripleOf(vector: ArrayLike<number>): Triple {
  const [x, y, z] = Array.from(vector)
  if (x === undefined || y === undefined || z === undefined) {
    throw new Error(`a camera vector has ${vector.length} components, not 3`)
  }
  return [x, y, z]
}

/** What the camera reading needs of Mol*'s canvas. */
export interface LiveCanvas {
  camera: { state: Readonly<Camera.Snapshot> }
  boundingSphereVisible: { radius: number }
}

/**
 * The camera on screen as a SavedCamera, so applying it puts the eye back.
 * Mol* always clips to `radius` around the target; it is left out when that is
 * the visible scene's own radius, which is what a camera without one gets, so
 * the fog a whole-scene view draws survives the round trip.
 */
export function liveCamera(canvas: LiveCanvas): SavedCamera {
  const { position, target, up, radius, mode } = canvas.camera.state
  const sceneRadius = canvas.boundingSphereVisible.radius
  return {
    position: tripleOf(position),
    target: tripleOf(target),
    up: tripleOf(up),
    mode,
    ...(Math.abs(radius - sceneRadius) <= 1e-6 * Math.max(sceneRadius, 1)
      ? {}
      : { radius }),
  }
}
