import { extractStructureSequences } from 'p2s_mapper'
import useSWR from 'swr'

import { parseStructureTrajectory } from '../../ProteinView/structurePipeline'
import { withTemporaryMolstarPlugin } from '../../ProteinView/withTemporaryMolstarPlugin'
import { readStructureFile } from '../utils/readStructureFile'
import { STATIC_SWR_OPTIONS } from './swrOptions'

// Only the model is built here, never a representation: the dialog wants the
// sequences, and the format detection is the same one the view applies later.
// A file's text is kept, so the launch stores what was read rather than
// reading, and inflating, the file again.
async function fetchSequences({ file, url }: { file?: File; url?: string }) {
  const data = file ? await readStructureFile(file) : undefined
  const sequences = await withTemporaryMolstarPlugin(async plugin => {
    const trajectory = await parseStructureTrajectory({ plugin, data, url })
    const model = await plugin.builders.structure.createModel(trajectory)
    return extractStructureSequences(model)
  })
  if (!sequences?.length) {
    throw new Error('No protein sequence found in this structure')
  }
  return { sequences, data }
}

// Extract protein sequences from a structure given either a local File or a
// remote URL (exactly one is expected).
export default function useStructureFileSequence({
  file,
  url,
}: {
  file?: File
  url?: string
}) {
  const key = file
    ? (['structure-file', file.name, file.size, file.lastModified] as const)
    : url
      ? (['structure-url', url] as const)
      : null
  const { data, error, isLoading } = useSWR(
    key,
    () => fetchSequences({ file, url }),
    STATIC_SWR_OPTIONS,
  )
  return { error, isLoading, sequences: data?.sequences, text: data?.data }
}
