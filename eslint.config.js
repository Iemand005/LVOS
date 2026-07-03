import tseslint from 'typescript-eslint';

export default tseslint.config({
  files: ['**/*.ts', '**/*.tsx'],
  rules: {
    'no-restricted-syntax': [
      'error',
      {
        selector: 'ArrowFunctionExpression',
        message: 'Arrow functions are not allowed. Use a regular function instead.',
      },
      {
        selector: 'ChainExpression',
        message: 'Optional chaining (?.) is not allowed.',
      },
    ],
  },
});