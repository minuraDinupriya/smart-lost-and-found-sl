module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  ignorePatterns: ['dist', 'playwright-report', 'test-results', '*.cjs'],
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended', 'plugin:react-hooks/recommended'],
  plugins: ['@typescript-eslint'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        'no-undef': 'off', // The TypeScript build checks names, including type declarations.
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['*.config.ts'],
      env: { node: true },
    },
  ],
};
