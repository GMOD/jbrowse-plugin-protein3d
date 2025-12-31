export type AlignmentAlgorithm =
  | 'emboss_matcher'
  | 'emboss_needle'
  | 'emboss_water'
  | 'needleman_wunsch'
  | 'smith_waterman'

export const ALIGNMENT_ALGORITHMS = {
  MATCHER: 'emboss_matcher',
  NEEDLE: 'emboss_needle',
  WATER: 'emboss_water',
  NEEDLEMAN_WUNSCH: 'needleman_wunsch',
  SMITH_WATERMAN: 'smith_waterman',
} as const

export const DEFAULT_ALIGNMENT_ALGORITHM: AlignmentAlgorithm = 'smith_waterman'

export const ALIGNMENT_ALGORITHM_LABELS: Record<string, string> = {
  needleman_wunsch: 'Needleman-Wunsch',
  smith_waterman: 'Smith-Waterman',
  emboss_needle: 'EMBOSS NEEDLE',
  emboss_water: 'EMBOSS WATER',
  emboss_matcher: 'EMBOSS MATCHER',
}
