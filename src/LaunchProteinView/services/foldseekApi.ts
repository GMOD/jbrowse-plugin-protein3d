import { jsonfetch, timeout } from '../../fetchUtils'

export const FOLDSEEK_DATABASES = [
  { id: 'pdb100', label: 'PDB (100% redundancy)' },
  { id: 'afdb-swissprot', label: 'AlphaFold DB (Swiss-Prot)' },
  { id: 'afdb50', label: 'AlphaFold DB (50% redundancy)' },
  { id: 'afdb-proteome', label: 'AlphaFold DB (Proteomes)' },
  { id: 'cath50', label: 'CATH (50% redundancy)' },
  { id: 'mgnify_esm30', label: 'MGnify ESM30' },
  { id: 'bfmd', label: 'BFMD' },
  { id: 'gmgcl_id', label: 'GMGCL' },
] as const

export type FoldseekDatabaseId = (typeof FOLDSEEK_DATABASES)[number]['id']

export const DEFAULT_DATABASES: FoldseekDatabaseId[] = [
  'pdb100',
  'afdb-swissprot',
]

export interface FoldseekTicketResponse {
  id: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'ERROR'
  error?: string
}

export interface FoldseekAlignment {
  target: string
  seqId: number
  alnLength: number
  missmatches: number
  gapsOpened: number
  qStart: number
  qEnd: number
  tStart: number
  tEnd: number
  prob: number
  eValue: number
  score: number
  qLen: number
  tLen: number
  qAln: string
  tAln: string
  tCa: string
  tSeq: string
  taxId: number
  taxName: string
}

export interface FoldseekDatabaseResult {
  db: string
  alignments: FoldseekAlignment[][]
}

export interface FoldseekResult {
  query: {
    header: string
    sequence: string
  }
  results: FoldseekDatabaseResult[]
}

export async function submitFoldseekSearch(
  sequence: string,
  databases: FoldseekDatabaseId[],
) {
  const formData = new FormData()

  // Clean the sequence - remove any FASTA header and whitespace
  const cleanSequence = sequence
    .split('\n')
    .filter(line => !line.startsWith('>'))
    .join('')
    .replace(/\s/g, '')
    .toUpperCase()

  const fastaContent = `>query\n${cleanSequence}`
  console.log('[Foldseek] Submitting sequence:', fastaContent.slice(0, 100))
  console.log('[Foldseek] Sequence length:', cleanSequence.length)
  console.log('[Foldseek] Databases:', databases)

  const blob = new Blob([fastaContent], { type: 'text/plain' })
  formData.append('q', blob, 'query.fasta')

  formData.append('mode', 'all')
  formData.append('email', 'colin.diesh@gmail.com')
  for (const db of databases) {
    formData.append('database[]', db)
  }

  const response = await fetch('https://search.foldseek.com/api/ticket', {
    method: 'POST',
    body: formData,
  })

  const responseData = await response.json()
  console.log('[Foldseek] Submit response:', responseData)

  if (!response.ok) {
    throw new Error(
      `Foldseek submission failed: ${response.status} ${JSON.stringify(responseData)}`,
    )
  }

  return responseData as FoldseekTicketResponse
}

export async function pollFoldseekStatus(ticketId: string) {
  const result = (await jsonfetch(
    `https://search.foldseek.com/api/ticket/${ticketId}`,
  )) as FoldseekTicketResponse
  console.log('[Foldseek] Poll status:', result)
  return result
}

export async function getFoldseekResults(
  ticketId: string,
  dbIndex: number,
): Promise<FoldseekDatabaseResult> {
  const result = await jsonfetch(
    `https://search.foldseek.com/api/result/${ticketId}/${dbIndex}`,
  )
  console.log('[Foldseek] Results for db', dbIndex, ':', result)
  return result as FoldseekDatabaseResult
}

export async function waitForFoldseekResults(
  ticketId: string,
  databases: FoldseekDatabaseId[],
  onStatusChange?: (status: string) => void,
) {
  const maxAttempts = 180
  let attempts = 0

  while (attempts < maxAttempts) {
    const status = await pollFoldseekStatus(ticketId)

    if (status.status === 'ERROR') {
      console.error('[Foldseek] Search error:', status)
      throw new Error(
        `Foldseek search failed: ${status.error || 'Unknown error'}`,
      )
    }

    if (status.status === 'COMPLETE') {
      onStatusChange?.('Fetching results...')
      const results: FoldseekResult = {
        query: { header: '', sequence: '' },
        results: [],
      }

      for (let i = 0; i < databases.length; i++) {
        const dbResult = await getFoldseekResults(ticketId, i)
        results.results.push(dbResult)
      }

      return results
    }

    onStatusChange?.(
      `Search ${status.status.toLowerCase()}... (${attempts + 1}s)`,
    )
    await timeout(1000)
    attempts++
  }

  throw new Error('Foldseek search timed out')
}
