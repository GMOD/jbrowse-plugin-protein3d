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

function session(known: string[] = []) {
  return {
    addTemporaryAssembly: vi.fn(),
    addSessionTrackConf: vi.fn(),
    addView: vi.fn().mockReturnValue({ navToLocString: async () => {} }),
    assemblyManager: {
      get: (name: string) => (known.includes(name) ? { name } : undefined),
    },
  }
}

test('a failed UniProt download adds no assembly, track or view', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('gone', { status: 503 })),
  )
  const s = session()
  await expect(
    launchProteinAnnotationView({ session: s, feature, uniprotId: 'P04637' }),
  ).rejects.toThrow(/503/)
  expect(s.addTemporaryAssembly).not.toHaveBeenCalled()
  expect(s.addSessionTrackConf).not.toHaveBeenCalled()
  expect(s.addView).not.toHaveBeenCalled()
})

// adding the assembly a second time made the host warn "already exists", and
// another isoform of an entry is the usual reason for a second view
test('a second view of an entry reuses its assembly and tracks', async () => {
  const fetched = vi.fn(async () => new Response('##gff-version 3\n'))
  vi.stubGlobal('fetch', fetched)
  const s = session(['P04637'])
  await launchProteinAnnotationView({
    session: s,
    feature,
    uniprotId: 'P04637',
  })
  expect(fetched).not.toHaveBeenCalled()
  expect(s.addTemporaryAssembly).not.toHaveBeenCalled()
  expect(s.addSessionTrackConf).not.toHaveBeenCalled()
  expect(s.addView).toHaveBeenCalledOnce()
})
