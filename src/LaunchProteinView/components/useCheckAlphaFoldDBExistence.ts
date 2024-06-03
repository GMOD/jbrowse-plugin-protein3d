import { useEffect, useState } from 'react'

export function useCheckAlphaFoldDBExistence({
  foundStructureId,
}: {
  foundStructureId?: string
}) {
  const [error, setError] = useState<unknown>()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    ;(async () => {
      try {
        if (foundStructureId) {
          setLoading(true)
          await fetch(
            `https://alphafold.ebi.ac.uk/files/AF-${foundStructureId}-F1-model_v4.cif`,
            { method: 'HEAD' },
          )
          setLoading(false)
          setSuccess(true)
        }
      } catch (e) {
        console.error(e)
        setError(e)
      }
    })()
  }, [foundStructureId])
  return { error, loading, success }
}
