import { getProteinOneLetterCode } from 'molstar/lib/mol-model/sequence/constants'
import {
  Bond,
  StructureElement,
  StructureProperties,
  Unit,
} from 'molstar/lib/mol-model/structure'
import { ColorThemeCategory } from 'molstar/lib/mol-theme/color/categories'
import { Color } from 'molstar/lib/mol-util/color'
import { ScaleLegend } from 'molstar/lib/mol-util/legend'
import { ParamDefinition as PD } from 'molstar/lib/mol-util/param-definition'

import {
  HYDROPHOBICITY_KEY_SCORES,
  hydrophobicityRgb,
  kyteDoolittle,
} from './residueTracks'

import type { Location } from 'molstar/lib/mol-model/location'
import type { ColorTheme } from 'molstar/lib/mol-theme/color'
import type { ThemeDataContext } from 'molstar/lib/mol-theme/theme'

export const NON_AMINO_ACID_COLOR = Color(0xcccccc)

const KyteDoolittleColorThemeParams = {}

type Params = typeof KyteDoolittleColorThemeParams

function scoreColor(score: number) {
  const [r, g, b] = hydrophobicityRgb(score)
  return Color.fromRgb(r, g, b)
}

// Mol*'s own `hydrophobicity` theme is Wimley-White with the opposite colour
// direction, so the 3D view and the alignment strip disagreed under one label.
function KyteDoolittleColorTheme(
  ctx: ThemeDataContext,
  props: Record<string, never>,
): ColorTheme<Params> {
  const bondEnd = ctx.structure
    ? StructureElement.Location.create(ctx.structure.root)
    : undefined
  function compIdOf(location: Location) {
    let l: StructureElement.Location | undefined
    if (StructureElement.Location.is(location)) {
      l = location
    } else if (bondEnd && Bond.isLocation(location)) {
      const element = location.aUnit.elements[location.aIndex]
      if (element !== undefined) {
        bondEnd.unit = location.aUnit
        bondEnd.element = element
        l = bondEnd
      }
    }
    return l && Unit.isAtomic(l.unit)
      ? StructureProperties.atom.label_comp_id(l)
      : undefined
  }
  return {
    factory: KyteDoolittleColorTheme,
    granularity: 'group',
    preferSmoothing: true,
    color: location => {
      const compId = compIdOf(location)
      const score =
        compId === undefined
          ? undefined
          : kyteDoolittle(getProteinOneLetterCode(compId))
      return score === undefined ? NON_AMINO_ACID_COLOR : scoreColor(score)
    },
    props,
    description:
      'Colors amino acids by Kyte-Doolittle hydropathy: hydrophobic orange, hydrophilic blue. Everything else is grey.',
    legend: ScaleLegend(
      'Hydrophilic',
      'Hydrophobic',
      HYDROPHOBICITY_KEY_SCORES.map(score => scoreColor(score)),
    ),
  }
}

export const KyteDoolittleColorThemeProvider: ColorTheme.Provider<
  Params,
  'kyte-doolittle'
> = {
  name: 'kyte-doolittle',
  label: 'Hydrophobicity (Kyte-Doolittle)',
  category: ColorThemeCategory.Residue,
  factory: KyteDoolittleColorTheme,
  getParams: () => KyteDoolittleColorThemeParams,
  defaultValues: PD.getDefaultValues(KyteDoolittleColorThemeParams),
  isApplicable: ctx => !!ctx.structure,
}
