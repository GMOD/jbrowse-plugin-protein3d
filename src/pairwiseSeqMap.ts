export interface Alignment {
  alns: {
    id: string
    seq: string
  }[]
}

export function pairwiseSeqMap(alignment: Alignment) {
  const k1 = alignment.alns[0].seq
  const k2 = alignment.alns[1].seq
  if (k1.length !== k2.length) {
    throw new Error('mismatched length')
  }

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
