import { SimpleFeature } from '@jbrowse/core/util'
import { afterEach, expect, test, vi } from 'vitest'

import { launchProteinAnnotationView } from './launchProteinAnnotationView'

afterEach(() => {
  vi.unstubAllGlobals()
})

const feature = new SimpleFeature({
  uniqueId: 'gene',
  refName: 'chr17',
  start: 0,
  end: 10,
})

test('a failed UniProt download adds no assembly, track or view', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('gone', { status: 503 })),
  )
  const addTemporaryAssembly = vi.fn()
  const addSessionTrackConf = vi.fn()
  const addView = vi.fn(() => {
    throw new Error('no view should be added')
  })
  await expect(
    launchProteinAnnotationView({
      session: { addTemporaryAssembly, addSessionTrackConf, addView },
      feature,
      uniprotId: 'P04637',
    }),
  ).rejects.toThrow(/503/)
  expect(addTemporaryAssembly).not.toHaveBeenCalled()
  expect(addSessionTrackConf).not.toHaveBeenCalled()
  expect(addView).not.toHaveBeenCalled()
})
