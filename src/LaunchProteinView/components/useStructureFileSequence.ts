import { useEffect, useState } from 'react'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { loadStructureFromURL } from '../../ProteinView/loadStructureFromURL'

async function structureFileSequenceFetcher(url: string) {
  const ret = document.createElement('div')
  const p = await createPluginUI({
    target: ret,
    render: renderReact18,
  })
  const { seq } = await loadStructureFromURL({ url, plugin: p })
  p.unmount()
  ret.remove()
  return seq
}

export function useStructureFileSequence({
  foundStructureId,
}: {
  foundStructureId?: string
}) {
  const [error, setError] = useState<unknown>()
  const [isLoading, setLoading] = useState(false)
  const [seq, setSeq] = useState<string>()
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (foundStructureId) {
          setLoading(true)
          const url = `https://alphafold.ebi.ac.uk/files/AF-${foundStructureId}-F1-model_v4.cif`
          const seq = await structureFileSequenceFetcher(url)
          setSeq(seq)
        }
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [foundStructureId])
  return { error, isLoading, seq }
}
