import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    /**
     * THE /ds REGISTRY, EXEMPTED — and only this file.
     *
     * ds-docs.tsx is a registry module, not a component module: its subject is
     * the vocabulary tables (AMBIENT_COMPONENTS, SHADCN_DEFAULT_COMPONENTS),
     * and the playgrounds it exports exist to be referenced BY those tables.
     * The entries embed JSX that calls the playgrounds, so splitting data from
     * components here means either a circular import or a second file that has
     * to be edited in lockstep with the first — worse than the Fast Refresh
     * granularity the rule is protecting.
     *
     * Everywhere the split is honest, we took it: lib/icon-library.ts,
     * assistant/kit-vocabulary.ts, assistant/compose-response.ts.
     */
    files: ['src/components/ds/ds-docs.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
