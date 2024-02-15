export interface Alignment {
  alns: {
    id: string
    seq: string
  }[]
}

export default function pairwiseSeqMap(alignment: Alignment) {
  const structure = alignment.alns[0].seq
  const genomeSequence = alignment.alns[1].seq
  if (structure.length !== genomeSequence.length) {
    throw new Error('mismatched length')
  }

  let j = 0
  let k = 0
  const structureToTranscriptPosition = {} as Record<string, number | undefined>
  const transcriptToStructurePositon = {} as Record<string, number | undefined>
  // const mismatch1 = {} as Record<string, boolean | undefined>
  // const mismatch2 = {} as Record<string, boolean | undefined>

  for (let i = k; i < structure.length; i++) {
    const c1 = structure[i]
    const c2 = genomeSequence[i]

    if (c1 === c2) {
      structureToTranscriptPosition[j] = k
      transcriptToStructurePositon[k] = j
      k++
      j++
    } else if (c2 === '-') {
      j++
    } else if (c1 === '-') {
      k++
    } else {
      structureToTranscriptPosition[j] = k
      transcriptToStructurePositon[k] = j

      // mismatch
      // mismatch1[j] = true
      // mismatch2[k] = true
      k++
      j++
    }
  }
  return { structureToTranscriptPosition, transcriptToStructurePositon }
}
