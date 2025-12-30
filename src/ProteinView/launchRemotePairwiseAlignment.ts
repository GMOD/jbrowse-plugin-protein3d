import { parsePairwise } from 'clustal-js'

import { textfetch, timeout } from '../fetchUtils'
import { AlignmentAlgorithm } from './types'

const EBI_REST_BASE_URL = 'https://www.ebi.ac.uk/Tools/services/rest'

function parseAlignmentResult(result: string) {
  const filtered = result
    .split('\n')
    .filter(line => !/^\s*\d+\s*$/.test(line))
    .join('\n')
    .trim()

  if (!filtered) {
    throw new Error('Empty alignment result from server')
  }

  return {
    pairwiseAlignment: parsePairwise(filtered),
  }
}

async function runEmbossAlignment({
  algorithm,
  seq1,
  seq2,
  onProgress,
}: {
  algorithm: AlignmentAlgorithm
  seq1: string
  seq2: string
  onProgress: (arg: string) => void
}) {
  const jobId = await textfetch(`${EBI_REST_BASE_URL}/${algorithm}/run`, {
    method: 'POST',
    body: new URLSearchParams({
      email: 'colin.diesh@gmail.com',
      asequence: `>a\n${seq1}`,
      bsequence: `>b\n${seq2}`,
    }),
  })
  await wait({ jobId, algorithm, onProgress })

  const result = await textfetch(
    `${EBI_REST_BASE_URL}/${algorithm}/result/${jobId}/aln`,
  )
  return parseAlignmentResult(result)
}
/**
 * Polls the EBI REST API until the alignment job completes
 */
async function wait({
  onProgress,
  jobId,
  algorithm,
}: {
  jobId: string
  algorithm: string
  onProgress: (arg: string) => void
}) {
  const POLL_INTERVAL_MS = 1000
  const COUNTDOWN_SECONDS = 10

  // eslint-disable-next-line  @typescript-eslint/no-unnecessary-condition
  while (true) {
    // Countdown before next status check
    for (let i = 0; i < COUNTDOWN_SECONDS; i++) {
      await timeout(POLL_INTERVAL_MS)
      onProgress(
        `Re-checking pairwiseAlignment to PDB seq1,seq2 in... ${COUNTDOWN_SECONDS - i}`,
      )
    }

    const status = await textfetch(
      `${EBI_REST_BASE_URL}/${algorithm}/status/${jobId}`,
    )

    if (status === 'FINISHED') {
      break
    } else if (status.includes('FAILED')) {
      throw new Error(`Alignment job failed with status: ${status}`)
    }
  }
}

export async function launchPairwiseAlignment({
  algorithm,
  seq1,
  seq2,
  onProgress,
}: {
  algorithm: AlignmentAlgorithm
  seq1: string
  seq2: string
  onProgress: (arg: string) => void
}) {
  onProgress(`Launching ${algorithm} alignment...`)
  return runEmbossAlignment({ algorithm, seq1, seq2, onProgress })
}
