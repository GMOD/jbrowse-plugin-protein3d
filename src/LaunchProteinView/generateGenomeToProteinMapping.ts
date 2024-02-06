import { Feature, notEmpty } from '@jbrowse/core/util'

export interface Alignment {
  alns: {
    id: string
    seq: string
  }[]
}

function align(alignment: Alignment, query: number) {
  const k1 = alignment.alns[0].seq
  const k2 = alignment.alns[1].seq
  if (k1.length !== k2.length) {
    throw new Error('mismatched length')
  }

  // let k1 =
  //   'MGQKGHKDSLYPCGGTPESSLHEALDQCMTALDLFLTNQFSEALSYLKPRTKESMYHSLTYATILEMQAMMTFDPQDILLAGNMMKEAQMLCQRHRRKSSVTDSFSSLVNRPTLGQFTEEEIHAEVCYAECLLQRAALTFLQGSSHGGAVRPRALHDPSHACSCPPGPGRQHLFLLQDENMVSFIKGGIKVRNSYQTYKELDSLVQSSQYCKGENHPHFEGGVKLGVGAFNLTLSMLPTRILRLLEFVGFSGNKDYGLLQLEEGASGHSFRSVLCVMLLLCYHTFLTFVLGTGNVNIEEAEKLLKPYLNRYPKGAIFLFFAGRIEVIKGNIDAAIRRFEECCEAQQHWKQFHHMCYWELMWCFTYKGQWKMSYFYADLLSKENCWSKATYIYMKAAYLSMFGKEDHKPFGDDEVELFRAVPGLKLKIAGKSLPTEKFAIRKSRRYFSSNPISLPVPALEMMYIWNGYAVIGKQPKLTDGILEIITKAEEMLEKGPENEYSVDDECLVKLLKGLCLKYLGRVQEAEENFRSISANEKKIKYDHYLIPNALLELALLLMEQDRNEEAIKLLESAKQNYKNYSMESRTHFRIQAATLQAKSSLENSSRSMVSSVSL-'
  // let k2 =
  //   '--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------MKAAYLSMFGKEDHKPFGDDEVELFRAVPGLKLKIAGKSLPTEKFAIRKSRRYFSSNPISLPVPALEMMYIWNGYAVIGKQPKLTDGILEIITKAEEMLEKGPENEYSVDDECLVKLLKGLCLKYLGRVQEAEENFRSISANEKKIKYDHYLIPNALLELALLLMEQDRNEEAIKLLESAKQNYKNYSMESRTHFRIQAATLQAKSSLENSSRSMVSSVSL*'
  let j = 0
  let k = 0

  // eslint-disable-next-line unicorn/no-for-loop
  for (let i = k; i < k1.length; i++) {
    const char1 = k1[i]
    const char2 = k2[i]

    if (char1 === char2) {
      k++
      j++
    } else if (char2 === '-') {
      j++
    } else if (char1 === '-') {
      k++
    }
    if (query === k) {
      return char2 === '-' ? undefined : j
    }
  }
  return undefined
}

// see similar function in msaview plugin
export function generateGenomeToProteinMapping({
  feature,
  alignment,
}: {
  feature: Feature
  alignment?: Alignment
}) {
  let iter = 0
  if (!alignment) {
    return []
  }
  const strand = feature.get('strand')
  const subs = feature.children() ?? []
  const cds = subs.filter(f => f.get('type') === 'CDS')
  if (strand === -1) {
    cds.sort((a, b) => b.get('start') - a.get('start'))
  } else {
    cds.sort((a, b) => a.get('start') - b.get('start'))
  }
  const s1 = alignment.alns[0].seq
  const s2 = alignment.alns[1].seq
  console.log({ s1, s2 })

  return cds
    .map(f => {
      const refName = f.get('refName').replace('chr', '')
      const featureStart = f.get('start')
      const featureEnd = f.get('end')
      const phase = f.get('phase')
      const len = featureEnd - featureStart
      const op = Math.floor(len / 3)
      const sourceProteinStart = iter
      const sourceProteinEnd = iter + op
      const targetProteinStart = align(alignment, sourceProteinStart)
      const targetProteinEnd = align(alignment, sourceProteinEnd)
      iter += op
      if (targetProteinStart !== undefined && targetProteinEnd !== undefined) {
        console.log({
          sourceProteinStart,
          sourceProteinEnd,
          targetProteinStart,
          targetProteinEnd,
          k1: s1.slice(sourceProteinStart, sourceProteinEnd),
          k2: s2.slice(targetProteinStart, targetProteinEnd),
        })
        return {
          refName,
          featureStart,
          featureEnd,
          sourceProteinStart,
          sourceProteinEnd,
          targetProteinStart,
          targetProteinEnd,
          phase,
          strand,
        } as const
      } else {
        return undefined
      }
    })
    .filter(notEmpty)
}
