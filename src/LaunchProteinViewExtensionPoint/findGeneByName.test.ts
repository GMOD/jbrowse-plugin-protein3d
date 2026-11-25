import { expect, test } from 'vitest'

import { geneUnderHits } from './findGeneByName'

const assembly = {
  isValidRefName: (refName: string) =>
    ['chr17', 'chr17_KI270729v1_random'].includes(refName),
  getCanonicalRefName: (refName: string) => refName,
}

function hit(loc: string) {
  return { getLocation: () => loc, getTrackId: () => 'genes' }
}

const geneIn = (region: { refName: string }) =>
  Promise.resolve(`TP53 on ${region.refName}`)

test('a hit on a refName the assembly does not know is passed over', async () => {
  const found = await geneUnderHits({
    hits: [
      hit('chrUn_JTFH01000001v1_decoy:1-100'),
      hit('chr17:7668421-7687550'),
    ],
    assembly,
    trackIds: [],
    geneIn,
  })
  expect(found).toEqual({ feature: 'TP53 on chr17', trackId: 'genes' })
})

test("a gene on the genome view's refName wins over an earlier hit", async () => {
  const hits = [
    hit('chr17_KI270729v1_random:1-100'),
    hit('chr17:7668421-7687550'),
  ]
  expect(
    await geneUnderHits({
      hits,
      assembly,
      trackIds: [],
      preferredLoc: 'chr17:7,668,421-7,687,550',
      geneIn,
    }),
  ).toEqual({ feature: 'TP53 on chr17', trackId: 'genes' })
  expect(await geneUnderHits({ hits, assembly, trackIds: [], geneIn })).toEqual(
    { feature: 'TP53 on chr17_KI270729v1_random', trackId: 'genes' },
  )
})
