import { textfetch, timeout } from '../../fetchUtils'

const base = `https://www.ebi.ac.uk/Tools/services/rest`

async function runEmbossMatcher({
  sequence,
  onProgress,
}: {
  sequence: string
  onProgress: (arg: string) => void
}) {
  const jobId = await textfetch(`${base}/emboss_matcher/run`, {
    method: 'POST',
    body: new URLSearchParams({
      email: 'colin.diesh@gmail.com',
      sequence,
    }),
  })
  await wait({
    jobId,
    algorithm: 'emboss_matcher',
    onProgress,
  })
  return {
    msa: await textfetch(`${base}/emboss_matcher/result/${jobId}/fa`),
  }
}

async function runEmbossNeedle({
  sequence,
  onProgress,
}: {
  sequence: string
  onProgress: (arg: string) => void
}) {
  const jobId = await textfetch(`${base}/emboss_needle/run`, {
    method: 'POST',
    body: new URLSearchParams({
      email: 'colin.diesh@gmail.com',
      sequence,
    }),
  })
  await wait({
    jobId,
    algorithm: 'emboss_needle',
    onProgress,
  })
  return {
    msa: await textfetch(`${base}/emboss_needle/result/${jobId}/fa`),
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
      onProgress(`Re-checking alignment to PDB sequence in... ${10 - i}`)
    }
    const result = await textfetch(`${base}/${algorithm}/status/${jobId}`)

    if (result === 'FINISHED') {
      break
    }
  }
}

export async function launchMSA({
  algorithm,
  sequence,
  onProgress,
}: {
  algorithm: string
  sequence: string
  onProgress: (arg: string) => void
}) {
  onProgress(`Launching ${algorithm} MSA...`)
  if (algorithm === 'emboss_matcher') {
    return runEmbossMatcher({ sequence, onProgress })
  } else if (algorithm === 'emboss_needle') {
    return runEmbossNeedle({ sequence, onProgress })
  } else {
    throw new Error('unknown algorithm')
  }
}
