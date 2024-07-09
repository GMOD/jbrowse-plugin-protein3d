import { useEffect, useState } from 'react'
import { createPluginUI } from 'molstar/lib/mol-plugin-ui'
import { renderReact18 } from 'molstar/lib/mol-plugin-ui/react18'
import { loadStructureFromData } from '../../ProteinView/loadStructureFromData'

async function structureFileSequenceFetcher(file: File) {
  const ret = document.createElement('div')
  const p = await createPluginUI({
    target: ret,
    render: renderReact18,
  })
  const data = await file.text()
  const { seq } = await loadStructureFromData({ data, plugin: p })
  p.unmount()
  ret.remove()
  return seq
}

export default function useLocalStructureFileSequence({
  file,
}: {
  file?: File
}) {
  const [error, setError] = useState<unknown>()
  const [isLoading, setLoading] = useState(false)
  const [seq, setSeq] = useState<string>()
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (file) {
          setLoading(true)
          const seq = await structureFileSequenceFetcher(file)
          setSeq(seq)
        }
      } catch (e) {
        console.error(e)
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [file])
  return { error, isLoading, seq }
}
