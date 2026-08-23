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
		"comma-dangle": ["error", "never"],
		"no-var": "off",
		"no-sequences": "off",
		"comma-spacing": "warn",
		"no-trailing-spaces": "warn",
		"semi": ["warn", "always"],
		"quotes": ["warn", "double"],
		"no-unused-vars": "warn",
		"no-undef": "error",
		"eqeqeq": "warn",
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
				selector: "CallExpression[callee.property.name='addEventListener'][arguments.length=2]",
				message: "addEventListener requires a third options parameter for Netscape."
			}
		],
	},
});