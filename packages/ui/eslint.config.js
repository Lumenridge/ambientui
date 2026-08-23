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
     * THE SHADCN PRESET, EXEMPTED — and only these files.
     *
     * react-refresh/only-export-components is a Fast Refresh ergonomics rule:
     * a module that exports both a component and a value loses granular hot
     * reload. Our own code obeys it (the icon vocabulary lives in
     * lib/icon-library for exactly this reason).
     *
     * These are installed from the shadcn radix-nova preset and are
     * extended only through the shadcn CLI or governance (CLAUDE.md rule 4).
     * Upstream deliberately co-locates `badgeVariants`, `buttonVariants`, `tabsListVariants`, and
     * `useSidebar` with their components; splitting them would diverge from
     * the preset and make every future `shadcn add` a merge conflict — a real
     * cost, traded against a dev-only reload nicety.
     *
     * Removing a file from this list is the goal, not adding one. Nothing we
     * author belongs here.
     */
    files: [
      'src/components/badge.tsx',
      'src/components/button.tsx',
      'src/components/sidebar.tsx',
      'src/components/tabs.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
