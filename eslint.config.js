import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";
import jsdoc from "eslint-plugin-jsdoc";

export default defineConfig(
	{
		files: ["**/*.js"],

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
				appManager: "readonly",
				setTheme: "writable",
				WindowManager: "readonly",
				DesktopManager: "readonly",
				Dialog: "readonly",
				Modern: "readonly",
				flags: "readonly",
				getScreenShooter: "readonly",
				launchpad: "readonly"
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
			// ODO: pls block let at least
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

			// "@typescript-eslint/no-unused-vars": ["error", { 
			// 	"properties": "all" 
			// }],

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

	// ES6 files: allow arrow functions and optional chaining
	{
		files: ["Scripts/WebComponents.js"],

		rules: {
			"no-restricted-syntax": [
				"error",
				{
					selector: "CallExpression[callee.property.name='addEventListener'][arguments.length=2]",
					message: "addEventListener requires a third options parameter for Netscape."
				}
			]
		}
	}
);