import { SimpleFeature } from '@jbrowse/core/util'
import featureData from './data.json'
import { generateGenomeToProteinMapping } from './generateGenomeToProteinMapping'

test('mapping', () => {
  const feature = new SimpleFeature(featureData)
  const alignment = {
    consensus:
      '                                                                                                                                                                                                                                                                                                                          ...|:..|........|:.::...:..:....|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||| ',
    alns: [
      {
        id: 'a',
        seq: 'MAAAAQLSLTQLSSGNPVYEKYYRQVDTGNTGRVLASDAAAFLKKSGLPDLILGKIWDLADTDGKGILNKQEFFVALRLVACAQNGLEVSLSSLNLAVPPPRFHDTSSPLLISGTSAAELPWAVKPEDKAKYDAIFDSLSPVNGFLSGDKVKPVLLNSKLPVDILGRVWELSDIDHDGMLDRDEFAVAMFLVYCALEKEPVPMSLPPALVPPSKRKTWVVSPAEKAKYDEIFLKTDKDMDGFVSGLEVREIFLKTGLPSTLLAHIWSLCDTKDCGKLSKDQFALAFHLISQKLIKGIDPPHVLTPEMIPPSDRASLQKNIIGSSPVADFSAIKELDTLNNEIVDLQREKNNVEQDLKEKEDTIKQRTSEVQDLQDEVQRENTNLQKLQAQKQQVQELLDELDEQKAQLEEQLKEVRKKCAEEAQLISSLKAELTSQESQISTYEEELAKAREELSRLQQETAELEESVESGKAQLEPLQQHLQDSQQEISSMQMKLMEMKDLENHNSQLNWCSSPHSILVNGATDYCSLSTSSSETANLNEHVEGQSNLESEPIHQESPARSSPELLPSGVTDENEVTTAVTEKVCSELDNNRHSKEEDPFNVDSSSLTGPVADTNLDFFQSDPFVGSDPFKDDPFGKIDPFGGDPFKGSDPFASDCFFRQSTDPFATSSTDPFSAANNSSITSVETLKHNDPFAPGGTVVAASDSATDPFASVFGNESFGGGFADFSTLSKVNNEDPFRSATSSSVSNVVITKNVFEETSVKSEDEPPALPPKIGTPTRPCPLPPGKRSINKLDSPDPFKLNDPFQPFPGNDSPKEKDPEIFCDPFTSATTTTNKEADPSNFANFSAYPSEEDMIEWAKRESEREEEQRLARLNQQEQEDLELAIALSKSEISEA-',
      },
      {
        id: 'b',
        seq: '--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------MYLKSDSGLGGWITIPAVADVLKYSCIVCWSSREKNNVEQDLKEKEDTIKQRTSEVQDLQDEVQRENTNLQKLQAQKQQVQELLDELDEQKAQLEEQLKEVRKKCAEEAQLISSLKAELTSQESQISTYEEELAKAREELSRLQQETAELEESVESGKAQLEPLQQHLQDSQQEISSMQMKLMEMKDLENHNSQLNWCSSPHSILVNGATDYCSLSTSSSETANLNEHVEGQSNLESEPIHQESPARSSPELLPSGVTDENEVTTAVTEKVCSELDNNRHSKEEDPFNVDSSSLTGPVADTNLDFFQSDPFVGSDPFKDDPFGKIDPFGGDPFKGSDPFASDCFFRQSTDPFATSSTDPFSAANNSSITSVETLKHNDPFAPGGTVVAASDSATDPFASVFGNESFGGGFADFSTLSKVNNEDPFRSATSSSVSNVVITKNVFEETSVKSEDEPPALPPKIGTPTRPCPLPPGKRSINKLDSPDPFKLNDPFQPFPGNDSPKEKDPEIFCDPFTSATTTTNKEADPSNFANFSAYPSEEDMIEWAKRESEREEEQRLARLNQQEQEDLELAIALSKSEISEA*',
      },
    ],
  }
  expect(
    generateGenomeToProteinMapping({ feature, alignment }),
  ).toMatchSnapshot()
})
