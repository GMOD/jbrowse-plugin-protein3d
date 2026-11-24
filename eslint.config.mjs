import {
  displayRestrictedSyntax,
  noUseEffectEvent,
  unobservedComponents,
} from '@jbrowse/display-kit/conformance/lintRules'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['eslint.config.mjs', 'dist/*', 'esbuild.mjs'] },
  { languageOptions: { parser: tseslint.parser } },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...displayRestrictedSyntax],
      'no-restricted-imports': ['error', { paths: [noUseEffectEvent] }],
    },
  },
  {
    files: ['src/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...displayRestrictedSyntax,
        ...unobservedComponents,
      ],
    },
  },
)
