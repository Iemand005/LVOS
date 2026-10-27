import ts from "typescript";

/**
 * Runtime support for the IE8 build. IE8 has no accessor syntax in object
 * literals and no usable Object.defineProperty for plain objects, so accessors
 * are compiled into plain get<Name>/set<Name> methods and every statically known
 * property access is routed through these helpers.
 */
const HELPER_FUNCTIONS = `
/* ES5 Array/String polyfills for IE8 */
if (!Array.prototype.indexOf) {
	Array.prototype.indexOf = function(searchElement, fromIndex) {
		var len = this == null ? 0 : this.length >>> 0;
		if (len === 0) return -1;
		var n = typeof fromIndex === "number" ? fromIndex | 0 : 0;
		if (n >= len) return -1;
		var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);
		for (; k < len; k++) {
			if (k in this && this[k] === searchElement) return k;
		}
		return -1;
	};
}
if (!Array.prototype.lastIndexOf) {
	Array.prototype.lastIndexOf = function(searchElement, fromIndex) {
		var len = this == null ? 0 : this.length >>> 0;
		if (len === 0) return -1;
		var n = typeof fromIndex === "number" ? fromIndex | 0 : len - 1;
		var k = n >= 0 ? Math.min(n, len - 1) : len - Math.abs(n);
		for (; k >= 0; k--) {
			if (k in this && this[k] === searchElement) return k;
		}
		return -1;
	};
}
if (!String.prototype.trim) {
	String.prototype.trim = function() {
		return this.replace(/^\\s+|\\s+$/g, "");
	};
}
/* IE8 classList polyfill – installed only when the native implementation is absent. */
(function() {
	if (typeof document === "undefined" || !document.createElement) return;
	var testEl = document.createElement("div");
	if (testEl.classList) return; // already supported
	/* Trim leading/trailing whitespace in a class string. */
	function trim(s) { return s.replace(/^\\s+|\\s+$/g, ""); }
	/* Split a class string into a non-empty token array. */
	function tokens(el) {
		var raw = el.className || "";
		var parts = raw.split(/\\s+/);
		var result = [];
		for (var i = 0; i < parts.length; i++) if (parts[i]) result.push(parts[i]);
		return result;
	}
	function join(list) { return list.join(" "); }
	function DOMTokenList(el) { this._el = el; }
	DOMTokenList.prototype = {
		add: function() {
			var list = tokens(this._el);
			for (var i = 0; i < arguments.length; i++) {
				var token = String(arguments[i]);
				if (list.indexOf(token) === -1) list.push(token);
			}
			this._el.className = join(list);
		},
		remove: function() {
			var list = tokens(this._el);
			for (var i = 0; i < arguments.length; i++) {
				var token = String(arguments[i]);
				var idx = list.indexOf(token);
				if (idx !== -1) list.splice(idx, 1);
			}
			this._el.className = join(list);
		},
		toggle: function(token, force) {
			var has = this.contains(token);
			if (has && force !== true) this.remove(token);
			else if (!has && force !== false) this.add(token);
			return !has;
		},
		contains: function(token) {
			return tokens(this._el).indexOf(String(token)) !== -1;
		},
		toString: function() { return this._el.className || ""; },
		bind: function(method) {
			var self = this, args = Array.prototype.slice.call(arguments, 1);
			return function() { self[method].apply(self, args.concat(Array.prototype.slice.call(arguments))); };
		}
	};
	/* Install a classList getter on HTMLElement.prototype if defineProperty works on DOM nodes. */
	try {
		Object.defineProperty(HTMLElement.prototype, "classList", {
			get: function() {
				if (!this.__classList) this.__classList = new DOMTokenList(this);
				return this.__classList;
			},
			enumerable: false,
			configurable: true
		});
	} catch(e) {
		/* Fallback: patch individual elements on-the-fly via __lvosGet/classList usage is handled above. */
	}
})();
function __lvosCapitalize(name) {
	var text = String(name);
	return text.charAt(0).toUpperCase() + text.slice(1);
}
function __lvosMethodName(prefix, name) {
	var base = prefix + __lvosCapitalize(name).replace(/[^A-Za-z0-9_$]/g, "_");
	var method = base;
	var index = 1;
	while (__lvosReserved[method] || __lvosMethodNames[method]) method = base + "$" + (index++);
	__lvosMethodNames[method] = true;
	return method;
}
function __lvosRegister(target, name, getter, setter, enumerable) {
	if (!target) return;
	name = String(name);
	var info = __lvosAccessors[name];
	if (!info) info = __lvosAccessors[name] = { get: null, set: null };
	if (typeof getter === "function") {
		if (!info.get) info.get = __lvosMethodName("get", name);
		target[info.get] = getter;
	}
	if (typeof setter === "function") {
		if (!info.set) info.set = __lvosMethodName("set", name);
		target[info.set] = setter;
	}
	if (enumerable && !(name in target)) target[name] = undefined;
}
function __lvosDefineProperty(target, key, attributes) {
	if (!target || !attributes) return target;
	var hasGetter = typeof attributes.get === "function";
	var hasSetter = typeof attributes.set === "function";
	if (hasGetter || hasSetter) __lvosRegister(target, key, attributes.get, attributes.set, attributes.enumerable === true);
	if ("value" in attributes) target[key] = attributes.value;
	return target;
}
function __lvosDefineProperties(target, descriptors) {
	if (!target || !descriptors) return target;
	for (var key in descriptors) {
		if (Object.prototype.hasOwnProperty.call(descriptors, key))
			__lvosDefineProperty(target, key, descriptors[key]);
	}
	return target;
}
function __lvosObject(target, accessors) {
	for (var i = 0; i < accessors.length; i++) {
		var accessor = accessors[i];
		__lvosRegister(target, accessor.name, accessor.get, accessor.set, true);
	}
	return target;
}
function __lvosGet(object, key) {
	try {
		if (object == null) return undefined;
		var info = __lvosAccessors[key];
		if (info && info.get) {
			var getter = object[info.get];
			if (typeof getter === "function") return getter.call(object);
		}
		return object[key];
	} catch(ex) { console.warn ("Failed to get key in object:", object, key, ex); }
}
function __lvosSet(object, key, value) {
	if (object == null) return value;
	var info = __lvosAccessors[key];
	if (info) {
		if (info.set) {
			var setter = object[info.set];
			if (typeof setter === "function") {
				setter.call(object, value);
				return value;
			}
		} else if (info.get) {
			var getter = object[info.get];
			if (typeof getter === "function") return value;
		}
	}
	object[key] = value;
	return value;
}
function __lvosIsAccessorMethod(key) {
	return __lvosMethodNames[key] === true;
}
`;

/** @param {ts.Node} node */
function isAccessor(node) {
	return ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}

/** @param {ts.PropertyName} name @returns {string | null} */
function getPropertyName(name) {
	if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name) || ts.isNoSubstitutionTemplateLiteral(name))
		return name.text;
	return null;
}

/** @param {ts.Node} node @param {string} name */
function isObjectCall(node, name) {
	return ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) &&
		ts.isIdentifier(node.expression.expression) && node.expression.expression.text === "Object" &&
		node.expression.name.text === name;
}

/** @param {ts.Expression} node */
function descriptorHasAccessor(node) {
	if (!ts.isObjectLiteralExpression(node)) return true;
	for (const property of node.properties) {
		if (!ts.isPropertyAssignment(property)) continue;
		const name = getPropertyName(property.name);
		if (name === "get" || name === "set") return true;
	}
	return false;
}

/** @param {ts.Expression} node */
function descriptorsHaveAccessor(node) {
	if (!ts.isObjectLiteralExpression(node)) return true;
	for (const property of node.properties) {
		if (!ts.isPropertyAssignment(property)) return true;
		if (!ts.isObjectLiteralExpression(property.initializer) || descriptorHasAccessor(property.initializer)) return true;
	}
	return false;
}

/**
 * Find every accessor name that has to be rerouted, plus the object variables
 * that carry object-literal accessors (their dynamic [key] reads need the
 * helper too). Also reserve all existing get and set property names so a
 * generated accessor method never overwrites a real method.
 *
 * @param {ts.SourceFile} sourceFile
 */
function collectInfo(sourceFile) {
	const accessorNames = new Set();
	const accessorObjects = new Set();
	const reserved = new Set();
	const classAccessors = new Map();

	/** @param {string | null} name */
	const reserve = (name) => {
		if (name && (name.indexOf("get") === 0 || name.indexOf("set") === 0)) reserved.add(name);
	};

	/** @param {ts.Node} node */
	const visit = (node) => {
		if (ts.isPropertyAccessExpression(node)) reserve(node.name.text);

		if (ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node) || isAccessor(node))
			reserve(getPropertyName(node.name));

		if (isAccessor(node) && (ts.isClassDeclaration(node.parent) || ts.isClassExpression(node.parent))) {
			const name = getPropertyName(node.name);
			if (name !== null) {
				accessorNames.add(name);
				let entry = classAccessors.get(name);
				if (!entry) {
					entry = { get: false, set: false };
					classAccessors.set(name, entry);
				}
				if (ts.isGetAccessorDeclaration(node)) entry.get = true;
				else entry.set = true;
			}
		}

		if (ts.isObjectLiteralExpression(node)) {
			const names = [];
			for (const property of node.properties)
				if (isAccessor(property)) {
					const name = getPropertyName(property.name);
					if (name !== null) names.push(name);
				}
			for (const name of names) accessorNames.add(name);

			if (names.length) {
				const parent = node.parent;
				if (parent && ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) accessorObjects.add(parent.name.text);
				else if (parent && ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
					parent.right === node && ts.isIdentifier(parent.left)) accessorObjects.add(parent.left.text);
			}
		}

		if (isObjectCall(node, "defineProperty")) {
			const call = /** @type {ts.CallExpression} */ (node);
			if (call.arguments.length >= 3 && descriptorHasAccessor(call.arguments[2])) {
				const key = getPropertyName(/** @type {ts.PropertyName} */ (call.arguments[1]));
				if (key !== null) accessorNames.add(key);
			}
		}

		if (isObjectCall(node, "defineProperties")) {
			const call = /** @type {ts.CallExpression} */ (node);
			const descriptors = call.arguments[1];
			if (descriptors && descriptorsHaveAccessor(descriptors) && ts.isObjectLiteralExpression(descriptors)) {
				for (const property of descriptors.properties) {
					if (!ts.isPropertyAssignment(property)) continue;
					if (!descriptorHasAccessor(property.initializer)) continue;
					const key = getPropertyName(property.name);
					if (key !== null) accessorNames.add(key);
				}
			}
		}

		ts.forEachChild(node, visit);
	};
	visit(sourceFile);

	const methodNames = new Map();
	const used = new Set();
	/** @param {string} prefix @param {string} name */
	const allocate = (prefix, name) => {
		const base = prefix + name.charAt(0).toUpperCase() + name.slice(1).replace(/[^A-Za-z0-9_$]/g, "_");
		let method = base;
		let index = 1;
		while (reserved.has(method) || used.has(method)) method = base + "$" + (index++);
		used.add(method);
		reserved.add(method);
		return method;
	};
	classAccessors.forEach((entry, name) => {
		const methods = {};
		if (entry.get) methods.get = allocate("get", name);
		if (entry.set) methods.set = allocate("set", name);
		methodNames.set(name, methods);
	});

	return { accessorNames, accessorObjects, reserved, methodNames };
}

/**
 * Rewrite accessors and accessor property accesses to plain method calls.
 *
 * @param {ts.SourceFile} sourceFile
 * @param {{ accessorNames: Set<string>, accessorObjects: Set<string>, methodNames: Map<string, { get?: string, set?: string }> }} info
 */
function createTransformer(sourceFile, info, context) {
	const { accessorNames, accessorObjects, methodNames } = info;

	/** @param {string} name @param {ts.Expression[]} args */
	const call = (name, args) => ts.factory.createCallExpression(ts.factory.createIdentifier(name), undefined, args);
	/** @param {ts.Expression} object @param {ts.Expression} key */
	const get = (object, key) => call("__lvosGet", [object, key]);
	/** @param {ts.Expression} object @param {ts.Expression} key @param {ts.Expression} value */
	const set = (object, key, value) => call("__lvosSet", [object, key, value]);
	/** @param {string | null} name */
	const isAccessorName = (name) => name !== null && accessorNames.has(name);

	/**
	 * @param {ts.Expression} expression
	 * @returns {{ object: ts.Expression, key: ts.Expression, literal: boolean } | null}
	 */
	const accessInfo = (expression) => {
		if (ts.isPropertyAccessExpression(expression)) {
			const name = expression.name.text;
			const isAccessorObject = ts.isIdentifier(expression.expression) && accessorObjects.has(expression.expression.text);
			if (isAccessorName(name) || isAccessorObject)
				return { object: expression.expression, key: ts.factory.createStringLiteral(name), literal: true };
		} else if (ts.isElementAccessExpression(expression)) {
			const key = expression.argumentExpression;
			if ((ts.isStringLiteral(key) || ts.isNumericLiteral(key)) && isAccessorName(key.text))
				return { object: expression.expression, key: ts.factory.createStringLiteral(key.text), literal: true };
			if (ts.isIdentifier(expression.expression) && accessorObjects.has(expression.expression.text))
				return { object: expression.expression, key, literal: false };
		}
		return null;
	};

	/** @param {ts.Node} node */
	const visit = (node) => {
		if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) return transformClass(node);

		if (ts.isAssignmentExpression(node)) {
			const target = accessInfo(node.left);
			if (target) {
				const object = ts.visitNode(target.object, visit);
				const key = ts.visitNode(target.key, visit);
				const value = ts.visitNode(node.right, visit);
				const operator = node.operatorToken.kind;

				if (operator === ts.SyntaxKind.EqualsToken) return set(object, key, value);

				const binaryOperator = assignmentToBinaryOperator(operator);
				if (binaryOperator !== null) {
					const current = get(object, key);
					return set(object, key, ts.factory.createBinaryExpression(current, binaryOperator, value));
				}
			}
			return ts.visitEachChild(node, visit, context);
		}

		if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
			const target = accessInfo(node.operand);
			if (target && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken)) {
				const object = ts.visitNode(target.object, visit);
				const key = ts.visitNode(target.key, visit);
				const operator = node.operator === ts.SyntaxKind.PlusPlusToken ? ts.SyntaxKind.PlusToken : ts.SyntaxKind.MinusToken;
				const value = ts.factory.createBinaryExpression(get(object, key), operator, ts.factory.createNumericLiteral(1));
				return set(object, key, value);
			}
			return ts.visitEachChild(node, visit, context);
		}

		if (ts.isObjectLiteralExpression(node) && node.properties.some(isAccessor))
			return transformObjectLiteral(node);

		if (isObjectCall(node, "defineProperty")) {
			const args = node.arguments.map((argument) => ts.visitNode(argument, visit));
			return call("__lvosDefineProperty", args);
		}

		if (isObjectCall(node, "defineProperties")) {
			const args = node.arguments.map((argument) => ts.visitNode(argument, visit));
			return call("__lvosDefineProperties", args);
		}

		if (ts.isPropertyAccessExpression(node)) {
			const expression = ts.visitNode(node.expression, visit);
			const name = node.name.text;
			const isAccessorObject = ts.isIdentifier(node.expression) && accessorObjects.has(node.expression.text);
			const isCallee = ts.isCallExpression(node.parent) && node.parent.expression === node;
			if (isAccessorName(name) || (isAccessorObject && !isCallee))
				return get(expression, ts.factory.createStringLiteral(name));
			return ts.factory.updatePropertyAccessExpression(node, expression, node.name);
		}

		if (ts.isElementAccessExpression(node)) {
			const expression = ts.visitNode(node.expression, visit);
			const key = ts.visitNode(node.argumentExpression, visit);
			if ((ts.isStringLiteral(key) || ts.isNumericLiteral(key)) && isAccessorName(key.text))
				return get(expression, ts.factory.createStringLiteral(key.text));
			if (ts.isIdentifier(node.expression) && accessorObjects.has(node.expression.text))
				return get(expression, key);
			return ts.factory.updateElementAccessExpression(node, expression, key);
		}

		if (ts.isForInStatement(node)) {
			const statement = ts.visitEachChild(node, visit, context);
			if (!ts.isIdentifier(statement.expression) || !accessorObjects.has(statement.expression.text))
				return statement;

			const key = forInKey(statement.initializer);
			if (!key) return statement;

			const skip = ts.factory.createIfStatement(
				call("__lvosIsAccessorMethod", [ts.factory.createIdentifier(key)]),
				ts.factory.createContinueStatement()
			);
			const body = ts.isBlock(statement.statement)
				? ts.factory.updateBlock(statement.statement, [skip].concat(statement.statement.statements))
				: ts.factory.createBlock([skip, statement.statement], true);
			return ts.factory.updateForInStatement(statement, statement.initializer, statement.expression, body);
		}

		return ts.visitEachChild(node, visit, context);
	};

	/** @param {ts.ObjectLiteralExpression} node */
	const transformObjectLiteral = (node) => {
		const accessors = new Map();
		const properties = [];

		for (const property of node.properties) {
			if (!isAccessor(property)) {
				properties.push(ts.visitNode(property, visit));
				continue;
			}

			const name = getPropertyName(property.name);
			if (name === null) {
				properties.push(ts.visitNode(property, visit));
				continue;
			}

			let entry = accessors.get(name);
			if (!entry) {
				entry = { get: null, set: null };
				accessors.set(name, entry);
			}

			const accessor = ts.visitEachChild(property, visit, context);
			const fn = ts.factory.createFunctionExpression(undefined, undefined, undefined, undefined, accessor.parameters, accessor.type, accessor.body);
			if (ts.isGetAccessorDeclaration(property)) entry.get = fn;
			else entry.set = fn;
		}

		const descriptors = [];
		accessors.forEach((entry, name) => {
			const descriptorProperties = [ts.factory.createPropertyAssignment("name", ts.factory.createStringLiteral(name))];
			if (entry.get) descriptorProperties.push(ts.factory.createPropertyAssignment("get", entry.get));
			if (entry.set) descriptorProperties.push(ts.factory.createPropertyAssignment("set", entry.set));
			descriptors.push(ts.factory.createObjectLiteralExpression(descriptorProperties, true));
		});

		return call("__lvosObject", [
			ts.factory.createObjectLiteralExpression(properties, node.multiLine),
			ts.factory.createArrayLiteralExpression(descriptors, true)
		]);
	};

	/**
	 * @param {ts.ClassDeclaration | ts.ClassExpression} node
	 */
	const transformClass = (node) => {
		const members = node.members.map((member) => {
			if (!isAccessor(member)) return ts.visitNode(member, visit);

			const name = getPropertyName(member.name);
			const methods = name === null ? undefined : methodNames.get(name);
			const methodName = methods && (ts.isGetAccessorDeclaration(member) ? methods.get : methods.set);
			if (!methodName) return ts.visitNode(member, visit);

			const parameters = member.parameters.map((parameter) => ts.visitNode(parameter, visit));
			const body = member.body ? ts.visitNode(member.body, visit) : undefined;
			const method = ts.factory.createMethodDeclaration(
				ts.getModifiers(member),
				undefined,
				ts.factory.createIdentifier(methodName),
				undefined,
				undefined,
				parameters,
				member.type,
				body
			);
			ts.setOriginalNode(method, member);
			ts.setTextRange(method, member);
			return method;
		});

		if (ts.isClassDeclaration(node))
			return ts.factory.updateClassDeclaration(node, ts.getModifiers(node), node.name, node.typeParameters, node.heritageClauses, members);
		return ts.factory.updateClassExpression(node, ts.getModifiers(node), node.name, node.typeParameters, node.heritageClauses, members);
	};

	return visit;
}

/** @param {ts.SyntaxKind} operator */
function assignmentToBinaryOperator(operator) {
	switch (operator) {
		case ts.SyntaxKind.PlusEqualsToken: return ts.SyntaxKind.PlusToken;
		case ts.SyntaxKind.MinusEqualsToken: return ts.SyntaxKind.MinusToken;
		case ts.SyntaxKind.AsteriskEqualsToken: return ts.SyntaxKind.AsteriskToken;
		case ts.SyntaxKind.SlashEqualsToken: return ts.SyntaxKind.SlashToken;
		case ts.SyntaxKind.PercentEqualsToken: return ts.SyntaxKind.PercentToken;
		case ts.SyntaxKind.AsteriskAsteriskEqualsToken: return ts.SyntaxKind.AsteriskAsteriskToken;
		case ts.SyntaxKind.LessThanLessThanEqualsToken: return ts.SyntaxKind.LessThanLessThanToken;
		case ts.SyntaxKind.GreaterThanGreaterThanEqualsToken: return ts.SyntaxKind.GreaterThanGreaterThanToken;
		case ts.SyntaxKind.GreaterThanGreaterThanGreaterThanEqualsToken: return ts.SyntaxKind.GreaterThanGreaterThanGreaterThanToken;
		case ts.SyntaxKind.AmpersandEqualsToken: return ts.SyntaxKind.AmpersandToken;
		case ts.SyntaxKind.BarEqualsToken: return ts.SyntaxKind.BarToken;
		case ts.SyntaxKind.CaretEqualsToken: return ts.SyntaxKind.CaretToken;
		default: return null;
	}
}

/** @param {ts.ForInitializer} initializer */
function forInKey(initializer) {
	if (ts.isVariableDeclarationList(initializer)) {
		const declaration = initializer.declarations[0];
		return declaration && ts.isIdentifier(declaration.name) ? declaration.name.text : null;
	}
	if (ts.isIdentifier(initializer)) return initializer.text;
	return null;
}

/** @param {string} code @param {Set<string>} reserved @param {Map<string, { get?: string, set?: string }>} methodNames */
function injectHelper(code, reserved, methodNames) {
	const names = Array.from(reserved).sort();
	const accessors = {};
	methodNames.forEach((methods, name) => { accessors[name] = methods; });
	const declaration = "var __lvosReserved = {" + names.map((name) => JSON.stringify(name) + ": true").join(", ") + "};\n" +
		"var __lvosAccessors = " + JSON.stringify(accessors) + ";\nvar __lvosMethodNames = {};\n";
	const helper = declaration + HELPER_FUNCTIONS;
	const match = code.match(/^((?:\s|\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*(["'])use strict\2\s*;?[ \t]*(?:\r?\n|$))/);
	if (match) return match[1] + helper + code.slice(match[1].length);
	return helper + code;
}

/**
 * TypeScript cannot turn object-literal accessors into ES3, so those are
 * rewritten first. The resulting accessor-free source is then downleveled to
 * ES3, which turns classes, arrow functions, shorthand properties, template
 * literals, const/let and destructuring into syntax IE8 can parse.
 *
 * @param {string} source
 * @param {string} fileName
 * @returns {string}
 */
export function transpileForIe8(source, fileName) {
	const result = ts.transpileModule(source, {
		fileName,
		reportDiagnostics: true,
		compilerOptions: {
			target: ts.ScriptTarget.ES5,
			ignoreDeprecations: "6.0",
			removeComments: false,
			useDefineForClassFields: false,
			newLine: ts.NewLineKind.LineFeed
		}
	});
	const errors = (result.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
	if (errors.length) {
		const message = errors.map((diagnostic) =>
			ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
		).join("\n");
		throw new Error("IE8 downlevel failed for " + fileName + ":\n" + message);
	}
	return result.outputText;
}

/**
 * @param {string} source
 * @param {string} fileName
 * @returns {{ code: string, accessors: number, reserved: number }}
 */
export function transformAccessorsForIe8(source, fileName) {
	const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
	const info = collectInfo(sourceFile);
	const result = ts.transform(sourceFile, [
		(context) => (root) => ts.visitNode(root, createTransformer(sourceFile, info, context))
	]);
	const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
	const code = printer.printFile(result.transformed[0]);
	result.dispose();

	return {
		code: injectHelper(code, info.reserved, info.methodNames),
		accessors: info.accessorNames.size,
		reserved: info.reserved.size
	};
}
