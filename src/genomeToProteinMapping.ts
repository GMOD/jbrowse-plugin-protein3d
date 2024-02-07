import { Feature, notEmpty } from '@jbrowse/core/util'

export interface Alignment {
  alns: {
    id: string
    seq: string
  }[]
}

function map(alignment: Alignment) {
  const k1 = alignment.alns[0].seq
  const k2 = alignment.alns[1].seq
  if (k1.length !== k2.length) {
    throw new Error('mismatched length')
  }

  //MGQKGHKDSLYPCGGTPESSLHEALDQCMTALDLFLTNQFSEALSYLKPRTKESMYHSLTYATILEMQAMMTFDPQDILLAGNMMKEAQMLCQRHRRKSSVTDSFSSLVNRPTLGQFTEEEIHAEVCYAECLLQRAALTFLQGSSHGGAVRPRALHDPSHACSCPPGPGRQHLFLLQDENMVSFIKGGIKVRNSYQTYKELDSLVQSSQYCKGENHPHFEGGVKLGVGAFNLTLSMLPTRILRLLEFVGFSGNKDYGLLQLEEGASGHSFRSVLCVMLLLCYHTFLTFVLGTGNVNIEEAEKLLKPYLNRYPKGAIFLFFAGRIEVIKGNIDAAIRRFEECCEAQQHWKQFHHMCYWELMWCFTYKGQWKMSYFYADLLSKENCWSKATYIYMKAAYLSMFGKEDHKPFGDDEVELFRAVPGLKLKIAGKSLPTEKFAIRKSRRYFSSNPISLPVPALEMMYIWNGYAVIGKQPKLTDGILEIITKAEEMLEKGPENEYSVDDECLVKLLKGLCLKYLGRVQEAEENFRSISANEKKIKYDHYLIPNALLELALLLMEQDRNEEAIKLLESAKQNYKNYSMESRTHFRIQAATLQAKSSLENSSRSMVSSVSL-
  //--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------MKAAYLSMFGKEDHKPFGDDEVELFRAVPGLKLKIAGKSLPTEKFAIRKSRRYFSSNPISLPVPALEMMYIWNGYAVIGKQPKLTDGILEIITKAEEMLEKGPENEYSVDDECLVKLLKGLCLKYLGRVQEAEENFRSISANEKKIKYDHYLIPNALLELALLLMEQDRNEEAIKLLESAKQNYKNYSMESRTHFRIQAATLQAKSSLENSSRSMVSSVSL*
  let j = 0
  let k = 0
  const coord1 = {} as Record<string, number | undefined>
  const coord2 = {} as Record<string, number | undefined>
  const mismatch1 = {} as Record<string, boolean | undefined>
  const mismatch2 = {} as Record<string, boolean | undefined>

  // eslint-disable-next-line unicorn/no-for-loop
  for (let i = k; i < k1.length; i++) {
    const char1 = k1[i]
    const char2 = k2[i]

    if (char1 === char2) {
      coord1[j] = k
      coord2[k] = j
      k++
      j++
    } else if (char2 === '-') {
      j++
    } else if (char1 === '-') {
      k++
    } else {
      coord1[j] = k
      coord2[k] = j
      mismatch1[j] = true
      mismatch2[k] = true
      k++
      j++
    }
  }
  return { coord1, coord2, mismatch1, mismatch2 }
}

// see similar function in msaview plugin
export function genomeToProteinMapping({ feature }: { feature: Feature }) {
  const strand = feature.get('strand')
  const refName = feature.get('refName')
  const subs = feature.children() ?? []
  const cds = subs
    .filter(f => f.get('type') === 'CDS')
    .sort((a, b) => strand * (a.get('start') - b.get('start')))
  const g2p = {} as Record<number, number | undefined>
  const p2g = {} as Record<number, number | undefined>

  let proteinCounter = 0
  for (const f of cds) {
    const phase = f.get('phase')
    for (
      let genomePos = f.get('start');
      genomePos < f.get('end');
      genomePos++
    ) {
      const proteinPos = Math.floor(proteinCounter++ / 3)
      g2p[genomePos] = proteinPos
      p2g[proteinPos] = genomePos + phase
    }
  }
  return { g2p, p2g, refName, strand }
}
