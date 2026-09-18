## [0.13.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.13.1...v0.13.2) (2026-09-18)

### Bug Fixes

- Address every model of a Mol* load; tighten the molstar pipeline ([38a6b0a](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/38a6b0aa7e61be30d55fe21caafddcc50e42794b))
- Read Mol* structures from the live state tree; one interaction subscription per view ([9a4eece](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/9a4eecebab894c00cc78553f17c1dfeade8e3394))

## [0.13.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.13.0...v0.13.1) (2026-09-18)

### Features

- A compact protein view: one alignment panel, fewer feature rows ([8f3acf5](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/8f3acf5bdf67e4470b23b94032bba81545a12ffa))

## [0.13.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.12.1...v0.13.0) (2026-09-18)

### Features

- Mapped chain colour scheme, and a solid magenta selection ([3de775a](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/3de775a87bca08b53cf88da418212dfa7713879b))
- Focus a one-residue seed the way a click on it does ([c69191c](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/c69191c933c16c694f5d45d569ba8a6a6af35d39))

## [0.12.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.12.0...v0.12.1) (2026-09-17)

### Bug Fixes

- Write the connected LinearGenomeView's settings on the view, not under init ([0a66a79](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/0a66a79568dc91d646ce8080dc8beba06a25bfdd))
- Keep init for v4 hosts, whose LinearGenomeView drops flat settings ([61b922f](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/61b922f9d8863abe8a2a560e31e5e3a4377a5643))

## [0.12.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.11.2...v0.12.0) (2026-09-16)

### Bug Fixes

- Offer the protein view only for features that code for one ([4b8cf7b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/4b8cf7bc22b17fe2e6fce1a49e11d6c01be245bd))
- Stop defaulting the organism to human, and match the gene symbol exactly ([4b6d8b2](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/4b6d8b2df08deba16b760dd7f413e1a86cf28b7f))
- Report partial lookup failures, and errors a reader can act on ([ddcd0c5](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ddcd0c5e9b75deb2e25956fbd4a77dc19940b333))
- Debounce the structure url, and say when the file is being read ([0443090](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/0443090f54e0333f476f7f7a0c0a5c35c66a8ece))
- Say what the columns mean and what the dialog does ([ec8f238](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ec8f23831455bd6f85a0e47660519179d23a88ab))
- One side-by-side choice for the dialog, not one per tab ([648762f](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/648762fafe17f7bb10ee3c7e103a3f8d7954f6ce))
- A transcript with no CDS is untranslated, not a 0aa isoform ([f2f7508](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f2f7508f1878098c9212902c98216e7f43fafba2))
- Read a PDB entry's residues from PDBe, not by parsing its mmCIF ([484bbcc](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/484bbcc789d0b6d0d9e7f53f9364da8c8aad9c34))
- Count the gene-name attempt only when its answer is read, and quote it ([efb7866](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/efb78665ea25a81cefe8a7b90b71d5050d9e6d2e))
- Debounce the taxon field, and say when its value means nothing ([b3df98f](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/b3df98fa4db732e413a1f10280781b4ab6b5d8a4))
- Launch the url the user typed, not the one from 600 ms ago ([3d227a6](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/3d227a688b286076c4fc17258cc9d7b2d518986a))
- A launch that names its own structure needs no accession ([9f845fe](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/9f845fe9c18cf758dea3815f8301ddd0df1f06c7))
- Ask AlphaFold DB which model a uniprotId opens ([4461292](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/4461292cefd055de8a25f5972b2eb4810bd16204))
- Report a structure's failure on the structure, once ([ff3020d](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ff3020d0c745b7c6e5979ba8afe3d04a959de9f0))
- Remember the layout, not the behaviour ([73b9366](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/73b9366bcb23797266a9300a0bd851ab32f846c1))
- Keep data-structure naming the alignment panel alone ([8381703](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/83817036823ba264eb122628e8a76c2d7d00b11e))
- An accession with no AlphaFold model says so ([50784cf](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/50784cf4630a6afa247eea717477825ee78cc448))
- Report a failed removal through the action, not a raw write ([82b28cb](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/82b28cb7637e836908b0baac4a9051d786928f2c))
- A structure removed mid-load leaves no ghost in Mol* ([9e2fe6e](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/9e2fe6e4aebf233df710a2e99613172ba9c14ab3))
- Keep the accession that was asked for across a save ([bc939b4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/bc939b48e748a29180788afba8e2128d7feff00a))
- Name the structure's failure `error`, as its readers do ([2028c0d](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/2028c0d0ab221244ec50d04d353d7202bf74400f))
- A retried load drops the failure it is retrying ([8d49fc9](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/8d49fc977f6b499a4a58e83fb42e1b75ac102c77))
- Key the loading overlay on the structure, not its text ([f230060](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f2300602f645ca2130a3a5597acbb27f769fca2f))
- Name the package that owns the jbrowse binary ([d5369a3](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/d5369a37481b4e5c0a54a76b51087cfde83c9b3f))

### Chores

- Lock p2s_mapper to the published 1.0.0 ([47666f9](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/47666f9cdbfe22c626cd1d1328a1fe0f3ce54e25))
- P2s_mapper 1.2.0, which stops retrying a 4xx ([727e49a](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/727e49ad13e7b7b0c83484bf3b1a9d4e9a93f37f))

### Documentation

- Say why the gene-like regex is a copy ([41a9e85](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/41a9e85979193080777fa9abf0079efa4e796840))
- The view model instantiates under vitest now ([6f59f11](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6f59f11db93f92eae5df2a2dc73fdbf4b0a51df6))
- The release-age cutoff is not the same everywhere ([e313954](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/e3139548783f52a19e768b85cd0f33cc71b41ca4))

### Features

- One Foldseek button, a cancel while it polls, and the 3Di out of the way ([d37345d](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/d37345d20d35bc9d1194464b65998d7fb02a6648))
- Type a PDB ID on the PDB search tab ([3dbe732](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/3dbe73237b4fd99f0be3bf60dfa25c41f971aa90))
- Say what is loading over the canvas ([ff122c2](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ff122c2a93d31ef34f8a5aa98c00ba268f3281b4))
- Put alignment quality in the header and stop forcing the panel open ([2e4dad8](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/2e4dad8b2bd6bfeecca83d194afe3e792a05b2f4))
- Remove a structure, and put a selection down ([57e0a36](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/57e0a36206b7810d62fef5a5c853110b4a992ece))
- Say what the track colours mean ([6a832ac](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6a832aca723ac8bf1b824d9b244e6808bfd9bf5b))

### Performance Improvements

- Translate every isoform off one sequence fetch ([f3f8bb0](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f3f8bb050acb587c51dceeead979559baf0b39e4))

### Refactoring

- One UniProt lookup for the dialog, and tabs that mount when opened ([9ac5013](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/9ac5013916ddcc160f3a475b6b04acb675c1089f))
- Delete the launch dialog's dead controls ([7d9cf01](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/7d9cf01ad9964b0893c5dd4b990e40fea9ae8fda))
- One definition of which transcripts code for a protein ([9a82338](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/9a82338546389f185486b0f20d96506210343d85))
- Every service error takes its shape from one module ([2774267](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/2774267fbc00f2dae3f016ecaa1fb00d6ff946b5))
- One partial-failure notice, and the tidy-ups around it ([e65d607](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/e65d6073129e5694a3a93bca0a6e4e5f46619b98))
- Split the menus by what they do ([929209b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/929209bda53e5700d78626fc3f24fa063df0e443))
- Lift the Mol* interaction wiring out of the structure model ([ba104ba](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ba104ba554d4d8bca1d046f65c3af7e14e7672ac))
- Give plddtColor its doc comment back ([f58df6b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f58df6b87d2eb30e59782dfa4d07fba162f6aaa9))
- Translate with core's geneticCodes rather than a vendored copy ([62482a1](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/62482a1af072f6aeefb813cc5a7129e28dab2143))
- Take the transcript-to-structure mapping from p2s_mapper ([3e37867](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/3e37867f76e734e52d1fa6848ed695e5ad06a38a))

### Styling

- Wrap the CLAUDE.md paragraph ([efd41bb](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/efd41bb5444c3d62d0318848f605800acba26dc5))

### Tests

- Refresh the dialog reference screenshots ([851277c](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/851277c3b38589930c16ef6d2bdb4be8eae81b52))
- Assert the lines the lookup logs instead of printing them ([666a101](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/666a10148a497352885a05033b35f17e5eed0718))
- Refresh the reference screenshots for the PDB ID field ([411675b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/411675b07809d7b6f944728e06e386df3c51a210))
- Refresh the reference screenshots ([f016f50](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f016f500beef4aa1c6fd6a68815a199273be0d83))
- Pin what a click on the Mol* background clears ([c1f263a](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/c1f263a0a450671d3a5cb24aa6564ca4f76d3555))
- Pin the Feature-to-p2s_mapper isoform conversion ([6ee2541](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6ee254184c4026acd45b079e0fc084c06ebe9305))
- Refresh the hotspot-panel capture ([dbb52e4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/dbb52e4d5073fab223a92a0d08189ab1df6e77d3))

## [0.11.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.11.1...v0.11.2) (2026-09-14)

### Bug Fixes

- Resolve refName aliases before a genome hover reaches the structure ([07212a5](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/07212a5900a677254c5173e73c9d8789e2a3c0e8))
- Put the AlphaMissense and pLDDT colours on the display, where v5 reads them ([e42a448](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/e42a448f122cbd5d18bbb2d0b855a1ff45276ed3))

### Chores

- Build against @jbrowse/core 5.0.0-beta.8 and MUI 9 without breaking v4 hosts ([62ec07a](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/62ec07adcf31b1262c59f6d3a480ab3ba26c7e7b))
- Externalize only what every supported host re-exports, not just the oldest ([2c914ab](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/2c914ab7ee1e6a29c3c0cea872950838f3f42ba8))
- The externals check is no longer floor-only ([a2769b4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/a2769b46735e5da65664978587e55d7472b4f37e))

### Documentation

- Record why a passing run prints nothing ([4491a05](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/4491a051764eca36ccc7fe1ad8fb9d213a611047))
- Why a genome hover has to canonicalize the refName ([0994d4f](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/0994d4f5c9b2e89f6f607a0ce01fc7b679037ef6))

### Tests

- Hold console output back unless a test fails ([4d701ac](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/4d701acb06c29330423c8b4b66470da05687784f))
- Fail the e2e on what the page says, instead of silencing it ([b5fc317](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/b5fc317d7bb3e9200cba793f3511173547c7f226))
- Scope an excused warning to the hosts it is true of ([4d85a18](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/4d85a18ca7f2885a6c448ccaadd56fff23c8a383))
- Typecheck and lint the e2e harness, which neither covered ([d87a906](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/d87a906e9e31948eba3525e43cbf22573679d948))
- Fail the publish gate on what the hosted release says ([972ee75](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/972ee7511527afbd3c3a217433b06752c2ea7316))

## [0.11.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.11.0...v0.11.1) (2026-09-13)

### Bug Fixes

- Score chains by identity over the shorter sequence ([f6405ff](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f6405ff3cff20e8fd94cca86807f09d7e3dccd21))
- Refuse an alignment whose rows are not the mapped sequences ([a3e2f04](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/a3e2f04bf118d5d720453a1b89abb0b030521946))
- A short but near-perfect peptide alignment is not low similarity ([0a62f85](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/0a62f851e08d3f8a9667e4f68fc05ddfe43c41b1))
- One letter per residue, so modified residues stop shifting positions ([08d5b7d](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/08d5b7d8be81272e7d117424ef80e3524227727e))
- Rank isoforms by alignment score against the chain the view will map ([762563b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/762563bc8d0076af9f73f52d48640f297436d558))
- A column that is a gap in both rows maps nothing ([9066508](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/906650810a267f515f33e95bb6167d2dba91d63e))
- Translate with the assembly's genetic code when the CDS names none ([2955c55](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/2955c55530c4294004e5ba8b0f409027418417e2))
- Unmap residues SIFTS assigns to a fused partner protein ([0a0c7c1](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/0a0c7c13f2717f300f2d0a0223c3e0e8ea9d0b5d))
- Choose the transcript's protein in a fusion by identity, and leave imported alignments alone ([ff03d67](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ff03d6739b5438641c3344f0aa4959035e2e0fa3))
- Say ready once every structure is loaded, aligned and SIFTS-mapped ([3fa2e33](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/3fa2e3301d4fc27278f11a3ba0f463086dcc071c))
- A Mol* hover or click acts only on the structure it landed on ([e94cb9e](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/e94cb9e246b88cb98ce1ebdb552d4f1299b2f52c))
- Set Mol*'s selection and highlight for all structures at once ([49cc0dd](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/49cc0ddf7ca7ec4881ff3e61137ea324cabf4f99))
- Link an MSA hover to the structure through its codon, not its column ([137bb13](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/137bb136c77b7980c0f87b2eee9ac7b0f471427f))
- Store only the setting a menu toggle changed ([019a2d7](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/019a2d74684046e2a94e224a5c558409fa9b5514))
- No pLDDT track for an experimental entry ([746d992](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/746d992b6fcedf17ca9c0cc3f0a9059235a6bcee))
- Drop the AlphaFold sequence search, which never found a structure ([d73debc](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/d73debc18eed3d9aa66de536fce32264bc96e74a))
- Open a PDB hit as its entry, and map the launch through the transcript ([b374667](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/b374667a045737e6fd2016de1862e6a0ac3c8f55))
- Three regressions a review found in the AlphaFold model lookup ([e0bc736](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/e0bc736a9537306597fb92fea9f7e00f71e3ae4d))
- The rest of a review's findings on the interaction and loading fixes ([a599c5c](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/a599c5cd359ee748ac7f91e08455b0b9d9b4d59a))
- Superpose the cell each trace came from, retry a load into a swapped plugin ([c95a1d9](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/c95a1d94f009a3bf1012a7a1802ab25efda6b390))
- Count a plugin as framed only once the seed has resolved ([bd509cb](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/bd509cb1c02ec2905dd430bfc7e1542b8a7631cb))

### Chores

- Drop the connectedMsaViewId the view no longer has ([bbe306c](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/bbe306cf0ff24907040c5abeabc0ff9420ac7846))
- Let typos read MT-ND2 as a gene, not a misspelling of AND ([6eb81c4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6eb81c4449f8f155d5d85ba27b72e8b74488234d))

### Documentation

- A selected residue is never framed ([6317aad](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6317aad3e0ae62d920da7e9518c6c644ce19c653))
- The on-the-fly alignment method, its precedent and its limits ([96f8222](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/96f82224f30630ea675d1739db3d067f663cc26d))
- Check the method against SIFTS, and record the gap-cost and chimera measurements ([4bffde4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/4bffde4ba7607e2d03d80f734a4069abf73a3265))
- Demos of the structures that are easy to map wrong, checked by script ([34cf4b9](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/34cf4b9f97a6851f848b4efe59a2c3eddfe4c36a))
- Keep the history of three fixes in their commits, not the comments ([ec38b62](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ec38b627e2e560ade5deb850834febdea931868e))
- The MSA and shared-plugin seams, and what protein-view-ready means ([9992ac4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/9992ac47d90ad6d6ea8dc87a71a3ac958abbcac0))
- Protein3d against the protein browser, after 2026-09-13 ([47e5a6a](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/47e5a6a2afd9440ff5b0b46ec6c9ea141cae20f8))
- What the 2026-09-13 afternoon landed, and what is still open ([f381f0e](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f381f0efac6f2fdc0af88f4f31747c3e6d879af5))
- Close the protein-browser handoff, filing what was left ([3682dba](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/3682dba92fc48862e5ad30fd5883794d27c748d9))

### Features

- Report alignment quality, and say when nothing could be aligned ([7f4991f](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/7f4991f6978866286f554ba6556aac1393d86cf0))
- Rank non-matching isoforms by alignment to the structure ([da16ff1](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/da16ff1acd507cc0e76979e922a3e1aed21b8e79))
- Ask AlphaFold DB which models exist instead of guessing the url ([0fadaba](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/0fadabac261f0e7276263a6a32d401b154a3584f))
- Select by transcript residue, pass spec settings through, title a spec-launched view ([8ffa625](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/8ffa6254c96ac02c66bfda293113f8934c591166))
- Frame a declared selection in the 3D canvas ([ce76a65](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ce76a65294889d5d15cd746e9cf876b1a9effa3c))

### Tests

- Refresh the hotspot reference screenshot, which still showed 1YCR's false low-similarity warning ([68ee43b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/68ee43b1008335f16050ea76b7626bdfe3ad5bd2))
- Parse real Mol* structures instead of casting fakes ([57bb219](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/57bb219fe51917a2ca62b90348ab84118202bfb6))
- Scroll the viewer into view before reading its ink ([c827c15](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/c827c1590759b8d40c0a6fc57f9003225bef1db5))

## [0.11.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.10.0...v0.11.0) (2026-09-05)

### Bug Fixes

- Put the chain picker in a header row so it stops narrowing the alignment ([5722e5b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/5722e5b67b46ca6e2c6c110ab80f67f610b42e42))
- Pick the chain the transcript explains most of, never a nucleic acid ([f6e5d1f](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f6e5d1f4e7b2a02e35e0f7b2d294cc331e451e52))
- Click the launch button in the visible tab, not the hidden one ([b695181](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/b695181f8a5d5eb9d0595dc5fa1964d50e783ec3))

### Chores

- Stop typos reading a 7-char commit hash as a word ([58be205](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/58be205af5f0b830519d74b1043b9687a73c7c4d))
- Ignore .claude/, which blocked pnpm version on a clean tree ([c4205d2](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/c4205d230d6bd66e230ea9b820de1cf46d6f18e5))

### Features

- Name each alignment panel and hover readout by its structure ([6db4edd](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6db4edd04155e14a2b92f96e23c25599b11fa60f))
- Number residues the way the structure's authors did ([84e6ba8](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/84e6ba86d58a2f77f2c98ac5a2a1205282fe01b9))
- Let a spec select a residue by its author number ([f1de9b2](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/f1de9b2b4159e97bf79a244e7f825abcf4a5c4bb))
- Add a PDB search tab listing SIFTS-mapped experimental structures ([00133b4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/00133b463b8e0b2e5d103c25b836e516f05ab2ba))

### Other Changes

- Require green ([4cef6c6](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/4cef6c62bd0bfcbd4f69788da9ad56fd651177c8))

### Tests

- Reference screenshots for the PDB search leg, on both CI hosts ([a51bac5](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/a51bac5b134b467411dca0878e522b4f45bd0810))

## [0.10.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.9.0...v0.10.0) (2026-09-05)

### Bug Fixes

- Route the display extension through extendStateModel, not a synchronous stateModel read ([85323a3](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/85323a3fd444d6cc7bd9b52a73968d6137cdd7bf))
- Preview structures on a headless molstar plugin and dispose it ([9ccd192](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/9ccd19214eca2f5ebe8ca0d96fe816478157b741))
- Key the confidence track by label_seq_id, not residue order ([bf3ca39](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/bf3ca394f3723e0dff38b2bd68d52c16d2581e45))
- Let a stored preference fill only what the snapshot leaves unsaid ([5176a04](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/5176a04a71b9339cc8015776ce8219b557758cdf))
- A hover with no linked 1D view open must not throw ([806ab13](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/806ab13b624b4543ecc06af5ca0d2781104d79d6))

### Documentation

- The local build works outside minimumReleaseAge's 24h window ([c62f4d3](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/c62f4d31ac7d13c1d03407194060ffffa24a7ebc))
- Correct stale alignment-algorithm descriptions ([2543caf](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/2543caf44879ec76c60ba3b0c5cbb67b12eaab7c))

### Features

- Publish showLoading so JBrowse's readiness contract waits for the structure load ([aa5c2f0](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/aa5c2f0d886abb989a42f5af27a1681d258b1ab6))
- Chain picker, mapped added structures, gzip uploads, residue ruler ([18d4bac](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/18d4bac2b90ea98698671060672849ad9299842e))
- Open several structures from one session spec ([fd6c31e](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/fd6c31e5eddb631834a7ab707881bd0434bf9230))
- Title a spec-launched view by its transcript and structure ids ([dbbe5fb](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/dbbe5fbb31c2b4e31f840d0846c8226a98922151))

### Other Changes

- Bump deps ([e4940b3](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/e4940b3a39e76479962588d60bee6dba3f6215d7))

### Refactoring

- One toggle list for both menus, dismissable errors, smaller main bundle ([ad3e276](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/ad3e2760b003bc31f9269e6d942703dd141fd9fa))
- Keep the 1D<->genome linkage on the view, not in a module registry ([7413cbe](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/7413cbed6371bc7181d9a187b3adf09edc160062))

### Tests

- Refresh the nightly protein-view reference for the residue ruler ([0960ab7](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/0960ab703059c5fbfb6892b316ac6da7a22683b3))
- Open three structures from one spec and check each maps its p53 chain ([b3d4477](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/b3d447743b8d4a6435708786dc33128fcd64b480))

## [0.9.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.4...v0.9.0) (2026-08-25)

### Features

- **BREAKING** Drop the two AlphaFold a3m MSA launches (#36) ([7b70869](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/7b70869604a2cf796d0ef2c2aee0831866318807))

## [0.8.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.3...v0.8.4) (2026-08-17)

### Bug Fixes

- Stop intercepting every request, and assert the menu ([6436d90](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6436d9072260c71b725b417d9d5b09e13160d166))

### Chores

- Ignore a node_modules symlink, not just the directory ([6c6b35b](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/6c6b35bf53fd84d1a2328499c768c87a93ef7bc1))
- Give the pinned-host setup a GitHub token ([561670f](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/561670fbceedfa38d05d504ea71b1cd9547a2c20))
- Generate the changelog with git-cliff, release from the tag ([51788b4](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/51788b418ea5ca1a575556a87d8bdef5f41393eb))

### Documentation

- Name both hosts the warning can mean ([54e2c48](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/54e2c48d24d552a0cb074d8321cecc029565a2c0))
- Add a CHANGELOG, backfilled across every tag ([2a2d3d6](https://github.com/GMOD/jbrowse-plugin-protein3d/commit/2a2d3d6f5941fb03bccb50e0bde928631feaa41a))

## [0.8.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.2...v0.8.3) (2026-08-17)

- Call the display's super contextMenuItems with a receiver, so Launch protein
  view appears on both host shapes
- One name per launch, and stable testids on the launch rows
- Sentence case for the rest of the UI labels
- Run the released-host e2e leg against v4.3.0 rather than v3.7.0
- Write down the molstar and host-version seams, and the gff-nostream CDS
  truncation that turned out to be a parser bug upstream

## [0.8.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.1...v0.8.2) (2026-08-06)

- Select the plugin's own UI by testid in the e2e suite, and refresh the nightly
  reference screenshots
- Apply prettier, and gate preversion on the format check
- Dependency upgrades

## [0.8.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.8.0...v0.8.1) (2026-08-06)

- Add UniProt feature tracks on PDB structures, via SIFTS
- Address PDB residues by their real label_seq_id, and detect the file format
- Serve both context-menu shapes, keeping the released one, and read whichever
  track lookup the host has
- Stop translating through the host's codon table, and gate the candidate build
  on real hosts
- Fix chain-correct confidence and isoform matching, the dark theme, and
  alignment paste
- Fix structure handle binding, bound the pairwise DP, and handle interior stop
  codons
- Say something when the host has workspaces but not the move, rather than
  silently not splitting
- Make the puppeteer suite able to fail, and enforce formatting in CI

## [0.8.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.7.0...v0.8.0) (2026-07-24)

- Scope the UniProt gene-name lookup to the assembly's organism
- Accept a uniprotId/pdbId structure shorthand, and extract pure URL builders

## [0.7.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.6.0...v0.7.0) (2026-07-24)

- Declarative view setup and reactive superposition
- Fix coordinate off-by-ones, stale-state bugs, and adapter duplication

## [0.6.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.8...v0.6.0) (2026-07-24)

- Content-hash the molstar chunk, so a stale cache can't serve the old one
- Centralize the highlight coordinate math to mirror core's getHighlightCoords

## [0.5.8](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.7...v0.5.8) (2026-07-04)

- Re-release

## [0.5.7](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.6...v0.5.7) (2026-07-04)

- Report the true Foldseek hit count instead of the truncated total
- Make the launch-view result tables theme-aware
- Centralize the 1D/MSA launch availability gating and error handling

## [0.5.6](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.5...v0.5.6) (2026-07-04)

- Lane-pack the protein feature tracks, with expandable rows
- Scroll a newly-selected feature into view, and only autoscroll the alignment
  on a large jump rather than on continuous sweeps

## [0.5.5](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.4...v0.5.5) (2026-07-02)

- Scroll the alignment into view instead of re-centering it on every hover

## [0.5.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.3...v0.5.4) (2026-07-01)

- Map exon-boundary codons correctly in protein->genome, and shift that
  navigation's locString to 1-based
- Assert the genome<->protein hover directions are mutual inverses

## [0.5.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.2...v0.5.3) (2026-06-27)

- Resolve the connected MsaView through the shared genome view on hover
- Map the transcript's entity rather than blindly entity 0
- Pass colorSchemeName as a native MsaView prop, not inside init
- Add the harness app that exercises PDB/AlphaFold structure mapping, deployed
  to GitHub Pages
- Consolidate id patterns and isoform ranking in LaunchProteinView

## [0.5.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.1...v0.5.2) (2026-06-27)

- Scroll the alignment to the persistent selection on first load

## [0.5.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.5.0...v0.5.1) (2026-06-27)

- Add a declarative initialSelection, to pre-light a domain on load

## [0.5.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.14...v0.5.0) (2026-06-26)

- Read label_seq_id, not auth_seq_id, on molstar hover and click
- Make ResidueSpec speak native 0-based coordinates, and unify
  highlight/select behind setMolstarLoci
- Fix the ProteinFeatureTrack unhide dead-end, hover marker, and geometry
- Make the 1D launch capability a type requirement

## [0.4.14](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.13...v0.4.14) (2026-06-21)

- Add data-testid/data-feature-\* hooks to FeatureBar

## [0.4.13](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.12...v0.4.13) (2026-06-21)

- Default a connected protein view to a side-by-side split, plus launch settings
- Tolerance-based stable screenshots in the E2E and docs suites

## [0.4.12](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.11...v0.4.12) (2026-06-19)

- Add request cancellation, fix SWR staleness, and rework the structure loader
- Switch the version tooling to sync-version.mjs, which stamps the distconfig
  plugin url

## [0.4.11](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.10...v0.4.11) (2026-06-19)

- Add a short-form declarative launch (uniprotId + transcriptId) and a
  connectedView launch param
- Compactify the protein view header, and add a compact-tracks toggle
- Stop genome hover echoing the codon highlight back onto the LGV
- Dedupe the launch dialog's transcript/isoform and structure-file hooks
- Free the WebGL context, and drop the dead alignment loader
- Fix dead AlphaFold URLs

## [0.4.10](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.9...v0.4.10) (2026-06-04)

- Default the AlphaFold lookup to auto rather than the feature's first
  recognized id

## [0.4.9](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.8...v0.4.9) (2026-06-03)

- Type fixes

## [0.4.8](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.7...v0.4.8) (2026-06-03)

- Add structure color schemes (pLDDT and friends), with a header selector and
  per-residue tracks
- Introduce branded coordinate types and a unified CoordinateMapper
- Make MSA<->structure hover sync gap-aware, on react-msaview's real model API
- Simplify the ProteinView menu: promote the common actions, add an Advanced
  submenu
- Always pair console.error with setError, so a failure is user-visible
- Split the components into smaller files, and add a primaryStructure getter

## [0.4.7](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.6...v0.4.7) (2026-05-29)

- Improve fetch and feature typing, dropping casts and a ts-expect-error
- Dedupe the loci interactivity helpers, and unify clear behavior

## [0.4.6](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.5...v0.4.6) (2026-05-29)

- Gate the selectors on the chosen lookup mode, and drop the hooks that gating
  left dead

## [0.4.5](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.4...v0.4.5) (2026-05-28)

- Simplifications, type fixes, and one bug fix
- Bump puppeteer, and refresh the snapshots

## [0.4.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.3...v0.4.4) (2026-05-24)

- Snapshot the coordinate mappings

## [0.4.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.2...v0.4.3) (2026-05-21)

- Fix the launch path for the Foldseek and protein view action menus
- Stop shipping source maps

## [0.4.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.1...v0.4.2) (2026-05-21)

- Dependency bumps

## [0.4.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.4.0...v0.4.1) (2026-05-21)

- Unify the protein view launch handlers, and dedupe the display-name logic
- Surface launch and lookup errors, and debounce manual UniProt input

## [0.4.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.5...v0.4.0) (2026-05-14)

- Make the highlight system declarative, fixing several bugs along the way
- Separate the alignment and feature visibility toggles in the header
- Fix the feature-track genome highlight, and simplify the highlight state
- Consolidate loci interactivity into applyLociInteractivity helpers
- Add follow-cursor genome auto-scroll, then remove it again in favor of the
  explicit toggles
- Fix the E2E tests, and remove dead code and debug logging

## [0.3.5](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.4...v0.3.5) (2026-05-05)

- Re-release

## [0.3.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.3...v0.3.4) (2026-05-05)

- Fix hover sync bugs, and add tests for them

## [0.3.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.2...v0.3.3) (2026-05-03)

- Dependency bumps

## [0.3.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.1...v0.3.2) (2026-05-03)

- Show the protein view menu item on canvas-based LinearBasicDisplay gene
  tracks, and guard it on having a launch path
- Migrate to pnpm, and ESLint to flat config with import-x
- Reduce useEffect usage

## [0.3.1](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.3.0...v0.3.1) (2026-04-16)

- Publish with --provenance

## [0.3.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.2.0...v0.3.0) (2026-04-16)

- Publish from CI with npm trusted publishing
- Deduplicate the highlight components, mapping functions and structure
  handling (#34)
- Replace the useEffect anti-patterns with autorun-based MobX tracking
- Add tests for selectBestTranscript
- Run the snapshot tests on a nightly cron job

## [0.2.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.1.0...v0.2.0) (2026-03-03)

- Lazy load protein3d (#31)
- Move the mappings into a global coordinate space
- Fix the tooltip and the pink mouseover on feature tracks
- Fetch the molstar css periodically

## [0.1.0](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.19...v0.1.0) (2026-01-29)

- Read the version from a generated `version.ts`
- Extract a stripStopCodon util, and improve the UI

## [0.0.19](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.18...v0.0.19) (2026-01-25)

- Simplifications, and fold the lookup into a single hook

## [0.0.18](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.17...v0.0.18) (2026-01-25)

- Dialog styling

## [0.0.17](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.16...v0.0.17) (2026-01-25)

- Query Foldseek (#25), search AlphaFold's API (#26), and use UniProt's ID
  mapping API instead of mygene.info (#27)
- Add a simple 1D viewer embedded in the 3D protein viewer (#24)
- Improve the mouseover behavior from protein3d to the MSA view (#28)
- Add an extension point for launching a protein view from e.g. the URL bar
  (#23)
- Add puppeteer-based tests that run against several JBrowse versions (#29)
- Add local alignment options, so less depends on the REST API

## [0.0.16](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.15...v0.0.16) (2025-12-04)

- Fix a bug in the featureUniprotId logic

## [0.0.15](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.14...v0.0.15) (2025-11-20)

- Let a GFF name its uniprotId fields in column 9 (#22)

## [0.0.14](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.13...v0.0.14) (2025-10-25)

- Fix an off-by-one
- Dependency updates

## [0.0.13](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.12...v0.0.13) (2025-10-14)

- Rework ProteinAlignment, and drop the dead structureModel code

## [0.0.12](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.11...v0.0.12) (2025-10-14)

- Remove the mode selector for now
- Stop the SWR lookups revalidating on focus, reconnect, or staleness

## [0.0.11](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.10...v0.0.11) (2025-10-14)

- Dependency updates

## [0.0.10](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.9...v0.0.10) (2025-10-13)

- Simplify proteinToGenomeMapping

## [0.0.9](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.8...v0.0.9) (2025-10-13)

- Report a 1-based position in the structure tooltip

## [0.0.8](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.7...v0.0.8) (2025-10-09)

- Allow selecting an isoform
- Auto-scroll to the selection
- Add the confidence URL, and a generic assembly name

## [0.0.7](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.6...v0.0.7) (2025-10-07)

- Bump molstar to v5, and add the geo export plugin
- Fix the missing UniProt ID error
- Modularize and simplify the lookup logic

## [0.0.6](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.5...v0.0.6) (2025-05-19)

- Flip the coloring
- Split the watch script

## [0.0.5](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.4...v0.0.5) (2024-11-04)

- Manually supply a UniProt ID
- Unique-ify the trackId and displayIds

## [0.0.4](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.3...v0.0.4) (2024-08-26)

- Launch a protein view from any gene
- Add adapters for UniProt AlphaFold data (#14)
- Convert to mobx-state-tree autoruns instead of useEffect, opening the way to
  displaying multiple structures (#13)
- Only generate tracks for the GFF fields that are available

## [0.0.3](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.2...v0.0.3) (2024-07-16)

- Skip the pairwise alignment when the sequences match exactly, and don't show
  a highlight or alignment for an exact match
- Remove the preloaded concept

## [0.0.2](https://github.com/GMOD/jbrowse-plugin-protein3d/compare/v0.0.2...v0.0.2) (2024-07-08)

- Initial release: open the AlphaFold or PDB structure for a gene, with the
  structure, the genome and the pairwise alignment linked by mouseover
- Load a structure from a local file
- Report whether a structure exists on AlphaFoldDB
- Build with esbuild for production and development (#9)
- MIT license
