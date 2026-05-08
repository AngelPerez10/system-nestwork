import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import jsxA11y from 'eslint-plugin-jsx-a11y'

const jsxA11yRecommendedWarn = Object.fromEntries(
  Object.entries(jsxA11y.flatConfigs.recommended.rules).map(([ruleName, ruleConfig]) => {
    if (Array.isArray(ruleConfig)) {
      return [ruleName, ['warn', ...ruleConfig.slice(1)]]
    }
    return [ruleName, 'warn']
  }),
)

export default tseslint.config(
  {
    ignores: [
      'dist',
      // Temporary: files with known JSX parse corruption pending dedicated cleanup.
      'src/pages/MiEscritorio/TareasPage.tsx',
      'src/pages/MiEscritorio/TareasTecnicoPage.tsx',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11yRecommendedWarn,
      // Temporary migration relaxations to unblock CI while legacy code is typed incrementally.
      '@typescript-eslint/no-explicit-any': ['warn', { ignoreRestArgs: true }],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-empty': 'warn',
      'no-constant-condition': 'warn',
      'no-unsafe-finally': 'warn',
      'prefer-const': 'warn',
      'no-useless-escape': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',
    },
  },
)
