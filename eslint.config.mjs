import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
