import base from './index.js';

export default [
  ...base,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
];
