export type AlignmentAlgorithm =
  | 'emboss_matcher'
  | 'emboss_needle'
  | 'emboss_water'

export const ALIGNMENT_ALGORITHMS = {
  MATCHER: 'emboss_matcher',
  NEEDLE: 'emboss_needle',
  WATER: 'emboss_water',
} as const

export const DEFAULT_ALIGNMENT_ALGORITHM: AlignmentAlgorithm = 'emboss_matcher'
