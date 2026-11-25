import { residueNumber, residueRuns } from 'p2s_mapper'

import type { Entity } from 'p2s_mapper'

interface ResidueEnd {
  letter?: string
  number: number
}

export interface ResidueQuery {
  chain?: string
  start: ResidueEnd
  end: ResidueEnd
}

const QUERY =
  /^(?:([^:\s]+):)?([A-Za-z])?(-?\d+)(?:\s*-\s*([A-Za-z])?(-?\d+))?$/

/**
 * A residue or a range typed the way a paper names one, in the structure's
 * author numbering: `248`, `R248`, `A:248`, `245-250` or `A:R245-T250`.
 */
export function parseResidueQuery(text: string): ResidueQuery | undefined {
  const match = QUERY.exec(text.trim())
  const [, chain, startLetter, startNumber, endLetter, endNumber] = match ?? []
  const start = startNumber
    ? { letter: startLetter?.toUpperCase(), number: Number(startNumber) }
    : undefined
  return start
    ? {
        chain,
        start,
        end: endNumber
          ? { letter: endLetter?.toUpperCase(), number: Number(endNumber) }
          : start,
      }
    : undefined
}

function residueName({ letter, number }: ResidueEnd) {
  return `${letter ?? ''}${number}`
}

function letterProblem(entity: Entity, { letter, number }: ResidueEnd) {
  const position = entity.seq
    .split('')
    .findIndex((_, pos) => residueNumber(entity, pos) === number)
  const actual = position === -1 ? undefined : entity.seq[position]
  return letter && actual && actual !== letter
    ? `Residue ${number} is ${actual}${number}, not ${letter}${number}`
    : undefined
}

/**
 * What is wrong with a typed residue on the mapped entity, or undefined when
 * it names residues the entity holds.
 */
export function residueQueryProblem(text: string, entity: Entity | undefined) {
  const query = parseResidueQuery(text)
  const named = query
    ? query.start === query.end
      ? residueName(query.start)
      : `${residueName(query.start)}-${residueName(query.end)}`
    : ''
  return !query
    ? 'Type a residue number such as 248, R248, A:248 or 245-250'
    : !entity
      ? 'The structure has not loaded'
      : query.end.number < query.start.number
        ? `${named} ends before it starts`
        : query.chain && !entity.chains.includes(query.chain)
          ? `Chain ${query.chain} is not the mapped chain (${entity.chains.join(', ')})`
          : residueRuns(entity, {
                start: query.start.number,
                end: query.end.number,
              }).length === 0
            ? `No residue numbered ${named} in this structure`
            : (letterProblem(entity, query.start) ??
              letterProblem(entity, query.end))
}
