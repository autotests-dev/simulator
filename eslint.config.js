// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const determinismRules = {
  'no-restricted-syntax': [
    'error',
    {
      selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
      message: 'Use sim-kit seeded RNG instead of Math.random() (determinism).',
    },
    {
      selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
      message: 'Use the sim-kit injectable clock instead of Date.now() (determinism).',
    },
    {
      selector: "NewExpression[callee.name='Date'][arguments.length=0]",
      message: 'Use the sim-kit injectable clock instead of `new Date()` (determinism).',
    },
  ],
};

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'apps/site/public/mockServiceWorker.js',
      '**/*.tsbuildinfo',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: [
      'apps/**/*.{ts,tsx}',
      'packages/domain/**/*.{ts,tsx}',
      'packages/ui/**/*.{ts,tsx}',
      'packages/config/**/*.{ts,tsx}',
    ],
    ignores: ['**/*.spec.ts', '**/*.config.{ts,js}', '**/validate.cli.ts'],
    rules: determinismRules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },
);
