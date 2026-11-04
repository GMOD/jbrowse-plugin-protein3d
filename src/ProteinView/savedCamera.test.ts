import { Camera } from 'molstar/lib/mol-canvas3d/camera'
import { Vec3 } from 'molstar/lib/mol-math/linear-algebra/3d/vec3'
import { expect, test } from 'vitest'

import { liveCamera } from './savedCamera'

function canvasAt(snapshot: Partial<Camera.Snapshot>, sceneRadius: number) {
  return {
    camera: {
      state: Camera.copySnapshot(Camera.createDefaultSnapshot(), snapshot),
    },
    boundingSphereVisible: { radius: sceneRadius },
  }
}

test('the live camera reads back as plain triples', () => {
  expect(
    liveCamera(
      canvasAt(
        {
          mode: 'orthographic',
          position: Vec3.create(74.7, 116.7, -65.4),
          target: Vec3.create(91.1, 94.2, -46.2),
          up: Vec3.create(0, 0, 1),
          radius: 8,
        },
        40,
      ),
    ),
  ).toEqual({
    mode: 'orthographic',
    position: [74.7, 116.7, -65.4],
    target: [91.1, 94.2, -46.2],
    up: [0, 0, 1],
    radius: 8,
  })
})

// a camera without a radius clips to the scene's, so that radius is the
// default a saved camera leaves out, and with it the fog stays on
test('a camera that clips to the whole scene saves no radius', () => {
  expect(liveCamera(canvasAt({ radius: 40 }, 40))).not.toHaveProperty('radius')
})
