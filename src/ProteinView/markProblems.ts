import { parseSite } from './residueSpec'

const MARK_TYPES = ['spheres', 'sticks', 'cartoon']
const HEX_COLOR = /^#[0-9a-f]{6}$/i

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function encodingProblems(where: string, entry: Record<string, unknown>) {
  const value = isRecord(entry.encoding)
    ? isRecord(entry.encoding.color)
      ? entry.encoding.color.value
      : undefined
    : undefined
  return [
    ...('color' in entry
      ? [`${where}.color is now encoding: { color: { value: '#rrggbb' } }`]
      : []),
    ...(value !== undefined &&
    (typeof value !== 'string' || !HEX_COLOR.test(value))
      ? [
          `${where}.encoding.color.value is a #rrggbb color, not ${JSON.stringify(value)}`,
        ]
      : []),
  ]
}

function siteProblems(where: string, key: string, site: unknown) {
  return typeof site === 'string' && parseSite(site)
    ? []
    : [
        `${where}.${key} is a site such as A:248, A:248@NH2, MOV or G:*, not ${String(site)}`,
      ]
}

/**
 * Why `marks` would draw something other than what it says: an entry in the
 * spelling 1.24 read (`style`, a string `color`), a site or mark type that
 * does not parse, or a cartoon over a chain the structure already draws.
 * `structures` are the view's, whose `chains` say which chains are drawn.
 */
export function markProblems(
  marks: unknown,
  structures: readonly { chains?: string[] }[] = [],
): string[] {
  if (marks === undefined) {
    return []
  }
  if (!Array.isArray(marks)) {
    return ['marks is a list']
  }
  return marks.flatMap((mark, i) => {
    const where = `marks[${i}]`
    if (!isRecord(mark)) {
      return [`${where} is an object such as { site: 'A:12', mark: 'spheres' }`]
    }
    const site =
      typeof mark.site === 'string' ? parseSite(mark.site) : undefined
    const structure =
      structures[typeof mark.structure === 'number' ? mark.structure : 0]
    const drawn = structure?.chains
    return [
      ...siteProblems(where, 'site', mark.site),
      ...('style' in mark ? [`${where}.style is now mark`] : []),
      ...(mark.mark !== undefined && !MARK_TYPES.includes(mark.mark as string)
        ? [
            `${where}.mark is one of ${MARK_TYPES.join(', ')}, not ${JSON.stringify(mark.mark)}`,
          ]
        : []),
      ...encodingProblems(where, mark),
      ...(mark.mark === 'cartoon' &&
      site?.kind === 'chain' &&
      (!drawn || drawn.includes(site.chain))
        ? [
            `${where} draws chain ${site.chain} as a cartoon over the one the structure draws; list the other chains in chains`,
          ]
        : []),
    ]
  })
}

/** The same check for `distances`: two sites and a constant encoding. */
export function distanceProblems(distances: unknown): string[] {
  if (distances === undefined) {
    return []
  }
  if (!Array.isArray(distances)) {
    return ['distances is a list']
  }
  return distances.flatMap((d, i) => {
    const where = `distances[${i}]`
    return isRecord(d)
      ? [
          ...siteProblems(where, 'a', d.a),
          ...siteProblems(where, 'b', d.b),
          ...encodingProblems(where, d),
        ]
      : [`${where} is an object such as { a: 'A:46@NZ', b: 'A:80@NZ' }`]
  })
}

/** `marks` and `distances`, refused with every problem found in either. */
export function checkedLayers<T extends Record<string, unknown>>(
  snapshot: T,
  structures: readonly { chains?: string[] }[] = [],
) {
  const problems = [
    ...markProblems(snapshot.marks, structures),
    ...distanceProblems(snapshot.distances),
  ]
  if (problems.length > 0) {
    throw new Error(problems.join('; '))
  }
  return snapshot
}
