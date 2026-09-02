import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";
import jsdoc from "eslint-plugin-jsdoc";

export default defineConfig(
	{
		files: ["**/*.js", "**/*.ts", "**/*.tsx", "**/*.ts", "**/*.d.ts"],

		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: "./jsconfig.json"
			},
			globals: {
				...globals.browser,
				...globals.commonjs,
				Anim: "readonly",
				Vector: "writable",
				LVMessenger: "writable",
				ClickOffset: "writable",
				lerp: "writable",
				windowManager: "readonly",
				appRegistry: "readonly",
				toggleReflections: "writable",
				setTheme: "writable",
				WindowManager: "readonly",
				Dialog: "readonly"
			}
		},

		plugins: {
			"@typescript-eslint": tseslint.plugin,
			jsdoc
		},

		rules: {
			...jsdoc.configs["flat/recommended"].rules,
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

			"jsdoc/require-jsdoc": "off",
			"jsdoc/require-returns-description": "off",
			"jsdoc/require-param-description": "off",
			"jsdoc/require-returns": "off",
			"jsdoc/no-undefined-types": "off",

			"no-restricted-syntax": [
				"error",
				{
					selector: "ArrowFunctionExpression",
					message: "Arrow functions are not allowed. Use a regular function instead."
				},
				{
					selector: "ChainExpression",
					message: "Optional chaining (?.) is not allowed."
				},
				{
					selector: "CallExpression[callee.property.name='addEventListener'][arguments.length=2]",
					message: "addEventListener requires a third options parameter for Netscape."
				}
			]
		}
	},

	// ES6 files: allow arrow functions
	{
		files: ["**/WebComponents.js"],

		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector: "ChainExpression",
					message: "Optional chaining (?.) is not allowed."
				},
				{
					selector: "CallExpression[callee.property.name='addEventListener'][arguments.length=2]",
					message: "addEventListener requires a third options parameter for Netscape."
				}
			]
		}
	}
);