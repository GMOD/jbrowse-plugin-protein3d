import { textfetch, timeout } from '../../fetchUtils'
import { parse, parsePairwise } from 'clustal-js'

const base = `https://www.ebi.ac.uk/Tools/services/rest`

async function runEmbossMatcher({
  seq1,
  seq2,
  onProgress,
}: {
  seq1: string
  seq2: string
  onProgress: (arg: string) => void
}) {
  const jobId = await textfetch(`${base}/emboss_matcher/run`, {
    method: 'POST',
    body: new URLSearchParams({
      email: 'colin.diesh@gmail.com',
      asequence: `>a\n${seq1}`,
      bsequence: `>b\n${seq2}`,
    }),
  })
  await wait({
    jobId,
    algorithm: 'emboss_matcher',
    onProgress,
  })
  const ret = await textfetch(`${base}/emboss_matcher/result/${jobId}/aln`)
  return {
    alignment: parsePairwise(
      ret
        .split('\n')
        .filter(line => !line.startsWith('#'))
        .join('\n'),
    ),
  }
}

async function runEmbossNeedle({
  seq1,
  seq2,
  onProgress,
}: {
  seq1: string
  seq2: string
  onProgress: (arg: string) => void
}) {
  const jobId = await textfetch(`${base}/emboss_needle/run`, {
    method: 'POST',
    body: new URLSearchParams({
      email: 'colin.diesh@gmail.com',
      asequence: `>a\n${seq1}`,
      bsequence: `>b\n${seq2}`,
    }),
  })
  await wait({
    jobId,
    algorithm: 'emboss_needle',
    onProgress,
  })

  const ret = await textfetch(`${base}/emboss_needle/result/${jobId}/aln`)
  return {
    alignment: parsePairwise(
      ret
        .split('\n')
        .filter(line => !line.startsWith('#'))
        .join('\n'),
    ),
  }
}
async function wait({
  onProgress,
  jobId,
  algorithm,
}: {
  jobId: string
  algorithm: string
  onProgress: (arg: string) => void
}) {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    for (let i = 0; i < 10; i++) {
      await timeout(1000)
      onProgress(`Re-checking alignment to PDB seq1,seq2 in... ${10 - i}`)
    }
    const result = await textfetch(`${base}/${algorithm}/status/${jobId}`)

    if (result === 'FINISHED') {
      break
    }
  }
}

export async function launchPairwiseAlignment({
  algorithm,
  seq1,
  seq2,
  onProgress,
}: {
  algorithm: string
  seq1: string
  seq2: string
  onProgress: (arg: string) => void
}) {
  onProgress(`Launching ${algorithm} MSA...`)
  if (algorithm === 'emboss_matcher') {
    return runEmbossMatcher({ seq1, seq2, onProgress })
  } else if (algorithm === 'emboss_needle') {
    return runEmbossNeedle({ seq1, seq2, onProgress })
  } else {
    throw new Error('unknown algorithm')
  }
}
