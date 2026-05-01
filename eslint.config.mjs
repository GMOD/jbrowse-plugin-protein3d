import eslint from '@eslint/js'
import { defineConfig } from 'eslint/config'
import { importX } from 'eslint-plugin-import-x'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: ['eslint.config.mjs', 'dist/*', 'esbuild.mjs'],
  },
  {
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      react: {
        version: 'v19.2.5',
      },
    },
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylisticTypeChecked,
  ...tseslint.configs.strictTypeChecked,
  importX.flatConfigs.recommended,
  eslintPluginReact.configs.flat.recommended,
  {
    plugins: {
      'react-hooks': eslintPluginReactHooks,
    },
    rules: eslintPluginReactHooks.configs.recommended.rules,
  },
  {
    rules: {
      'no-console': ['warn', { allow: ['error', 'warn'] }],
      'no-empty': 'off',
      'no-underscore-dangle': 'off',
      curly: 'error',
      semi: ['error', 'never'],
      'spaced-comment': ['error', 'always', { markers: ['/'] }],
      'one-var': ['error', 'never'],

      'import-x/no-unresolved': 'off',
      'import-x/order': [
        'error',
        {
          named: true,
          'newlines-between': 'always',
          alphabetize: { order: 'asc' },
          groups: [
            'builtin',
            ['external', 'internal'],
            ['parent', 'sibling', 'index', 'object'],
            'type',
          ],
          pathGroups: [
            { group: 'builtin', pattern: 'react', position: 'before' },
            { group: 'external', pattern: '@mui/icons-material', position: 'after' },
          ],
          pathGroupsExcludedImportTypes: ['react'],
        },
      ],

      'react/no-unescaped-entities': 'off',
      'react/prop-types': 'off',

      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', ignoreRestSiblings: true, caughtErrors: 'none' },
      ],
    },
  },
)
