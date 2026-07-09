import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import storybook from 'eslint-plugin-storybook'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

const legacyUiClassRestriction = {
  selector: 'JSXAttribute[name.name="className"][value.value=/((^|\\s)(btn|form|tabla)(\\s|$))|((^|\\s)(btn|form|tabla)(__|--))|((^|\\s)tabla-contenedor(\\s|$))/]',
  message: 'Usa componentes de shared/ui en lugar de clases legacy .btn, .form, .tabla y variantes __/--.',
}

const arbitraryColorClassRestriction = {
  selector: 'JSXAttribute[name.name="className"][value.value=/(^|\\s)(bg|text|border|ring|shadow)-\\[#[0-9a-fA-F]{3,8}\\]/]',
  message: 'Usa tokens del Design System en lugar de colores hardcodeados en className.',
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['playwright.config.js', 'e2e/**/*.{js,ts}'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-syntax': ['error', legacyUiClassRestriction, arbitraryColorClassRestriction],
      'react-refresh/only-export-components': 'warn',
    },
  },
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ['**/*.{ts,tsx}'],
  })),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      'no-restricted-syntax': ['error', legacyUiClassRestriction, arbitraryColorClassRestriction],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-refresh/only-export-components': 'warn',
    },
  },
  ...storybook.configs['flat/recommended'],
])
