/* jshint esversion: 6 */

import tseslint from 'typescript-eslint';

export default tseslint.config({
	files: ['**/*.js', '**/*.ts', '**/*.tsx', '*.d.ts'],
	languageOptions: {
		parser: tseslint.parser,
		parserOptions: {
			project: './jsconfig.json',
		},
	},
	plugins: {
		'@typescript-eslint': tseslint.plugin,
	},
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
			{
				selector: "CallExpression[callee.property.name='addEventListener']",
				message: "addEventListener must have a third options parameter."
			}
		],
	},
});