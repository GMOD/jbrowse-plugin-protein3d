import type { StructureElement } from 'molstar/lib/mol-model/structure'

interface StructureModel {
  obj?: {
    data: {
      sequence: {
        sequences: ReadonlyArray<{
          sequence: {
            label: {
              toArray(): ArrayLike<string>
            }
          }
        }>
      }
    }
  }
}

/**
 * Extracts protein sequences from a Molstar structure model
 * @param model - The Molstar structure model containing sequence data
 * @returns Array of protein sequences as strings, or undefined if no sequences found
 */
export function extractStructureSequences(
  model: StructureModel,
): string[] | undefined {
  return model.obj?.data.sequence.sequences.map(s => {
    const arr = s.sequence.label.toArray()
    let seq = ''
    // eslint-disable-next-line unicorn/no-for-loop,@typescript-eslint/prefer-for-of
    for (let i = 0; i < arr.length; i++) {
      seq += arr[i]!
    }
    return seq
  })
}
