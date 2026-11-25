import { expect, test } from 'vitest'

import {
  launchAssemblyName,
  withConnectedGenomeView,
} from './transcriptLinkage'

interface FakeView {
  id: string
  type: string
}

function fakeSession({ failOnCall }: { failOnCall?: number } = {}) {
  const views: FakeView[] = [{ id: 'existing', type: 'LinearGenomeView' }]
  let calls = 0
  return {
    views,
    addView(type: string) {
      calls += 1
      if (calls === failOnCall) {
        throw new Error(`${type} refused its snapshot`)
      }
      const view = { id: `added${calls}`, type }
      views.push(view)
      return view
    },
    removeView(view: FakeView) {
      views.splice(views.indexOf(view), 1)
    },
  }
}

const connectedView = { assembly: 'hg38', loc: 'chr17:7,668,421-7,687,550' }

test('a genome view the launch opened leaves with a view that failed to open', async () => {
  const session = fakeSession({ failOnCall: 2 })
  await expect(
    withConnectedGenomeView(session, { connectedView }, () =>
      Promise.resolve(session.addView('ProteinView')),
    ),
  ).rejects.toThrow('ProteinView refused its snapshot')
  expect(session.views.map(v => v.id)).toEqual(['existing'])
})

test('a genome view the launch was handed stays when the view fails', async () => {
  const session = fakeSession({ failOnCall: 1 })
  await expect(
    withConnectedGenomeView(
      session,
      { connectedViewId: 'existing', connectedView },
      () => Promise.resolve(session.addView('ProteinView')),
    ),
  ).rejects.toThrow('ProteinView refused its snapshot')
  expect(session.views.map(v => v.id)).toEqual(['existing'])
})

test('a launch that opens hands its view the genome view and says it owns it', async () => {
  const session = fakeSession()
  const opened = await withConnectedGenomeView(
    session,
    { connectedView },
    (connectedViewId, ownsConnectedView) =>
      Promise.resolve({ connectedViewId, ownsConnectedView }),
  )
  expect(opened).toEqual({ connectedViewId: 'added1', ownsConnectedView: true })
  expect(
    await withConnectedGenomeView(
      session,
      { connectedViewId: 'existing', connectedView },
      (connectedViewId, ownsConnectedView) =>
        Promise.resolve({ connectedViewId, ownsConnectedView }),
    ),
  ).toEqual({ connectedViewId: 'existing', ownsConnectedView: false })
})

// a gene lookup fell through to the session's first assembly here, and the
// variant then found no assembly at all
test('a genome view still navigating gives the launch the assembly it is launching on', () => {
  const session = {
    assemblyNames: ['hg38', 'hg19'],
    views: [
      { id: 'navigating', assemblyNames: [], launchAssemblyName: 'hg19' },
      { id: 'shown', assemblyNames: ['hg19'] },
    ],
  }
  expect(launchAssemblyName(session, { connectedViewId: 'navigating' })).toBe(
    'hg19',
  )
  expect(launchAssemblyName(session, { connectedViewId: 'shown' })).toBe('hg19')
})

test("a launch's assembly is its view's, then the one it names, then the session's first", () => {
  const session = {
    assemblyNames: ['hg38', 'hg19'],
    views: [{ id: 'shown', assemblyNames: ['hg19'] }],
  }
  const connectedView = { assembly: 'mm39' }
  expect(
    launchAssemblyName(session, { connectedViewId: 'shown', connectedView }),
  ).toBe('hg19')
  expect(launchAssemblyName(session, { connectedView })).toBe('mm39')
  expect(launchAssemblyName(session, {})).toBe('hg38')
})
