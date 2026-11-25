/**
 * Run a launch fn (sync or async) and surface any thrown error via onError.
 * Used to wrap `session.addView(...)` calls so MST validation errors don't
 * fall silently into the React error boundary.
 */
export async function safeLaunch(
  fn: () => unknown,
  onSuccess?: () => void,
  onError?: (e: unknown) => void,
) {
  try {
    await fn()
    onSuccess?.()
  } catch (e) {
    console.error(e)
    onError?.(e)
  }
}

interface LaunchRequirements {
  userSelectedProteinSequence?: { seq: string }
  selectedTranscript?: unknown
}

/**
 * The transcript requirements a 3D launch needs, as user-facing reasons for
 * any that are unmet; the structure it opens is the caller's to require, since
 * the 1D view opens without one. Callers decide whether to surface these (e.g.
 * suppressed while loading or while a real upstream error is already shown
 * via <ErrorMessage>, where a duplicate hint would mislead). A structure names
 * its own source, so no accession is asked for: bypassing a lookup that failed
 * or found the wrong gene is what a typed PDB id is for.
 */
export function getLaunchMissingReasons({
  userSelectedProteinSequence,
  selectedTranscript,
}: LaunchRequirements): string[] {
  return [
    !userSelectedProteinSequence?.seq &&
      'Could not compute protein sequence (feature may be missing CDS subfeatures)',
    !selectedTranscript && 'No transcript selected',
  ].filter((s): s is string => typeof s === 'string')
}
