import _ from 'lodash';
import { createHash } from 'crypto';

export { ObjectMask } from './object-mask.js';

/**
 * General utility functions for manipulating object.
 *
 * @class objtools
*/

/**
 * Determines whether a value is considered a scalar or an object.  Currently,
 * primitives plus Date types plus undefined and null plus functions are considered scalar.
 *
 * @method isScalar
 * @static
 * @param {Mixed} value - Value to check
 * @return {Boolean}
 */
export function isScalar(value: any): boolean {
	return typeof value !== 'object' || (value instanceof Date) || !value || typeof value === 'function';
}

/**
 * Returns true if the given value is considered a terminal value for traversal operations.
 * Terminal values are as follows:
 * - Any scalars (anything isScalar() returns true for)
 * - Any non-plain objects, other than arrays
 *
 * @method isTerminal
 * @param {Mixed} value
 * @return {Boolean}
 */
export function isTerminal(value: any): boolean {
	if (typeof value !== 'object') return true;

	if (value === null) return true;
	if (Array.isArray(value)) return false;

	let proto = Object.getPrototypeOf(value);
	return proto !== Object.prototype && proto !== null;
}

/**
 * Checks for deep equality between two object or values.
 *
 * @method deepEquals
 * @static
 * @param {Mixed} a
 * @param {Mixed} b
 * @return {Boolean}
 */
export function deepEquals(a: any, b: any): boolean {
	if (isScalar(a) && isScalar(b)) {
		return scalarEquals(a, b);
	}
	if (a === null || b === null || a === undefined || b === undefined) return a === b;
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEquals(a[i], b[i])) return false;
		}
		return true;
	} else if (!Array.isArray(a) && !Array.isArray(b)) {
		for (let key in a) {
			if (!deepEquals(a[key], b[key])) return false;
		}
		for (let key in b) {
			if (!deepEquals(a[key], b[key])) return false;
		}
		return true;
	} else {
		return false;
	}
}

/**
 * Checks whether two scalar values (as determined by isScalar()) are equal.
 *
 * @method scalarEquals
 * @static
 * @param {Mixed} a1 - First value
 * @param {Mixed} a2 - Second value
 * @return {Boolean}
 */
export function scalarEquals(a1: any, a2: any): boolean {
	if (a1 instanceof Date && a2 instanceof Date) return (a1.getTime() === a2.getTime());
	return a1 === a2;
}

/**
 * Returns a deep copy of the given value such that entities are not passed
 * by reference.
 *
 * @method deepCopy
 * @static
 * @param {Mixed} obj - The object or value to copy
 * @return {Mixed}
 */
export function deepCopy(obj: any): any {
	let res: any;
	if (isTerminal(obj)) {
		res = obj;
	} else if (Array.isArray(obj)) {
		res = Array(obj.length);
		for (let i = 0; i < obj.length; i++) {
			res[i] = deepCopy(obj[i]);
		}
	} else {
		res = {};
		for (let key in obj) {
			res[key] = deepCopy(obj[key]);
		}
	}
	return res;
}

/**
 * Given an object, converts it into a one-level-deep object where the keys are dot-separated
 * paths and the values are the values at those paths.
 *
 * @method collapseToDotted
 * @static
 * @param {Object} obj - The object to convert
 * @param {Boolean} [includeRedundantLevels] - If set to true, the returned object also includes
 * keys for internal objects.  By default, an object such as { foo: { bar: "baz"} } will be converted
 * into { "foo.bar": "baz" }.  If includeRedundantLevels is set, it will instead be converted
 * into { "foo": { bar: "baz" }, "foo.bar": "baz" } .
 * @param {Boolean} [stopAtArrays] - If set to true, the collapsing function will not descend into
 * arrays.
 * @example
 *   By default, an object such as { foo: [ "bar", "baz" ] } is converted
 *   into { "foo.0": "bar", "foo.1": "baz" }.  If stopAtArrays is set, this will instead be converted
 *   into { "foo": [ "bar", "baz" ] } .
 * @return {Object} - The result
 */
export function collapseToDotted(obj: any, includeRedundantLevels: boolean = false, stopAtArrays: boolean = false): { [dottedPath: string]: any } {
	let result = {};
	if (isScalar(obj)) return {};
	function addObj(obj: any, path: string) {
		if (isScalar(obj) || (Array.isArray(obj) && stopAtArrays)) {
			result[path] = obj;
			return;
		}
		if (includeRedundantLevels) {
			result[path] = obj;
		}
		for (let key in obj) {
			addObj(obj[key], path ? (path + '.' + key) : key);
		}
	}
	addObj(obj, '');
	delete result[''];
	return result;
}

/**
 * Returns whether or not the given query fields (in dotted notation) match the document
 * (also in dotted notation).  The "queries" here are simple equality matches.
 *
 * @method matchDottedObject
 * @static
 * @param {Object} doc - The document to test
 * @param {Object} query - A one-layer-deep set of key/values to check doc for
 * @return {Boolean} - Whether or not the doc matches
 */
export function matchDottedObject(doc: any, query: any): boolean {
	if (query === true) return doc === true;
	if (isScalar(query) || isScalar(doc)) return deepEquals(query, doc);
	for (let queryKey in query) {
		if (!deepEquals(doc[queryKey], query[queryKey])) {
			return false;
		}
	}
	return true;
}

/**
 * Same as matchDottedObject, but for non-dotted objects and queries. Deprecated, as it is
 *	equivalent to lodash.isMatch(), which we delegate to.
 *
 * @method matchObject
 * @static
 * @deprecated
 * @param {Object} doc - Object to match against, in structured (not dotted) form
 * @param {Object} query - Set of fields (in structed form) to match
 * @return {Boolean} - Whether or not the object matches
 */
export function matchObject(doc: any, query: any): boolean {
	return _.isMatch(doc, query);
}


// For syncObject
const unchangedSymbol = Symbol();

/**
 * Synchronizes one object to another object, in-place.  Updates to the existing object
 * are done in-place as much as possible.  Full objects are only replaced if necessary.
 *
 * @method syncObject
 * @static
 * @param {Object} toObj - The object to modify
 * @param {Object} fromObj - The object to copy from
 * @param {Object} [options]
 * @param {Function} options.onField - An optional callback to call whenever a field
 * is traversed during this function.  If it returns a boolean `false`, any modification is
 * prevented and further subfields will not be traversed.
 * @param {String} options.onField.field - The field name (dot-separated notation)
 * @param {Mixed} options.onField.toVal - What the field is being changed to
 * @param {Mixed} options.onField.fromVal - What the field used to be
 * @param {Object} options.onField.parentObj - The immediate parent object containing the field
 * @param {Function} options.onChange - Optional function to be called when a value changes.
 * @param {String} options.onChange.field - The field name (dot-separated notation)
 * @param {Mixed} options.onChange.toVal - What the field is being changed to
 * @param {Mixed} options.onChange.fromVal - What the field used to be
 * @param {Object} options.onChange.parentObj - The immediate parent object containing the field
 * @return {Object} - The resulting object (usually the same object as toObj)
 */
export type SyncObjectOptions = {
	onField?: (field: string, toVal: any, fromVal: any, parentObj: any) => boolean,
	onChange?: (field: string, toVal: any, fromVal: any, parentObj: any) => void
};
export function syncObject(toObj: any, fromObj: any, options: SyncObjectOptions = {}): any {
	// Returns the value that should be written to toVal's parent in place of toVal, or returns unchangedSymbol
	// if toVal is not changed.
	function syncSubObject(toVal: any, fromVal: any, parentObj: any, path: string) {
		let newVal: any;
		if (parentObj && options.onField && options.onField(path, toVal, fromVal, parentObj) === false) {
			return unchangedSymbol;
		}
		if (isScalar(toVal) && isScalar(fromVal)) {
			// Replace scalar value if it isn't identical
			if (!scalarEquals(fromVal, toVal)) {
				return fromVal;
			}
			return unchangedSymbol;
		} else if (isScalar(toVal) || isScalar(fromVal)) {
			// Exactly one of the two is scalar; either way, overwrite the key on toVal
			return fromVal;
		} else if (Array.isArray(toVal) && Array.isArray(fromVal)) {
			// Sync each array element individually. If array lengths are the same, sync in place; otherwise,
			// sync to new array.
			if (toVal.length === fromVal.length) {
				for (let i = 0; i < toVal.length; i++) {
					let elemPath: string = path ? (path + '.' + i) : String(i);
					newVal = syncSubObject(toVal[i], fromVal[i], toVal, elemPath);
					if (newVal !== unchangedSymbol) {
						if (options.onChange) {
							options.onChange(elemPath, toVal[i], fromVal[i], toVal);
						}
						toVal[i] = newVal;
					}
				}
				return unchangedSymbol;
			} else {
				// Must make new array and sync into it
				let newArr = [];
				for (let i = 0; i < fromVal.length; i++) {
					let elemPath: string = path ? (path + '.' + i) : String(i);
					newVal = syncSubObject(toVal[i], fromVal[i], toVal, elemPath);
					if (newVal !== unchangedSymbol || i >= toVal.length) {
						if (options.onChange) {
							options.onChange(elemPath, toVal[i], fromVal[i], toVal);
						}
					}
					newArr.push(fromVal[i]);
				}
				return newArr;
			}
		} else if (typeof toVal === 'object' && typeof fromVal === 'object') {
			// Iterate over keys of each object
			for (let key in fromVal) {
				let subPath = path ? (path + '.' + key) : key;
				if (!fromVal.hasOwnProperty(key)) continue;
				if (!toVal.hasOwnProperty(key)) {
					// Brand new field for toVal
					if (options.onField && options.onField(subPath, toVal[key], fromVal[key], toVal) === false) {
						continue;
					}
					if (options.onChange) {
						options.onChange(subPath, toVal[key], fromVal[key], toVal);
					}
					toVal[key] = fromVal[key];
				} else {
					// Replace if different
					newVal = syncSubObject(toVal[key], fromVal[key], toVal, subPath);
					if (newVal !== unchangedSymbol) {
						if (options.onChange) {
							options.onChange(subPath, toVal[key], fromVal[key], toVal);
						}
						toVal[key] = newVal;
					}
				}
			}
			// Now iterate over keys of toVal to find fields that should be deleted
			for (let key in toVal) {
				if (!toVal.hasOwnProperty(key) || fromVal.hasOwnProperty(key)) continue;
				let subPath = path ? (path + '.' + key) : key;
				if (options.onField && options.onField(subPath, toVal[key], fromVal[key], toVal) === false) {
					continue;
				}
				if (options.onChange) {
					options.onChange(subPath, toVal[key], fromVal[key], toVal);
				}
				delete toVal[key];
			}
			return unchangedSymbol;
		} else {
			// Type mismatch between toVal and fromVal; always replace
			return fromVal;
		}
	}

	syncSubObject(toObj, fromObj, null, '');
	return toObj;
}

/**
 * Sets the value at a given path in an object.
 *
 * @method setPath
 * @static
 * @param {Object} obj - The object
 * @param {String} path - The path, dot-separated
 * @param {Mixed} value - Value to set
 * @return {Object} - The same object
 */
export function setPath(obj: any, path: string, value: any): any {
	let cur = obj;
	let parts = path.split('.');
	for (let i = 0; i < parts.length; i++) {
		if (i === parts.length - 1) {
			cur[parts[i]] = value;
		} else {
			if (isScalar(cur[parts[i]])) cur[parts[i]] = {};
			cur = cur[parts[i]];
		}
	}
	return obj;
}

/**
 * Deletes the value at a given path in an object.
 *
 * @method deletePath
 * @static
 * @param {Object} obj
 * @param {String} path
 * @return {Object} - The object that was passed in
 */
export function deletePath(obj: any, path: string): any {
	let cur = obj;
	let parts = path.split('.');
	for (let i = 0; i < parts.length; i++) {
		if (i === parts.length - 1) {
			delete cur[parts[i]];
		} else {
			if (isScalar(cur[parts[i]])) {
				return obj;
			}
			cur = cur[parts[i]];
		}
	}
	return obj;
}

/**
 * Gets the value at a given path in an object.
 *
 * @method getPath
 * @static
 * @param {Object} obj - The object
 * @param {String} path - The path, dot-separated
 * @param {Boolean} allowSkipArrays - If true: If a field in an object is an array and the
 * path key is non-numeric, and the array has exactly 1 element, then the first element
 * of the array is used.
 * @return {Mixed} - The value at the path
 */
export function getPath(obj: any, path: string, allowSkipArrays: boolean = false): any {
	if (path === null || path === undefined) return obj;
	let cur = obj;
	let parts = path.split('.');
	for (let i = 0; i < parts.length; i++) {
		if (isScalar(cur)) return undefined;
		if (Array.isArray(cur) && allowSkipArrays && !(/^[0-9]+$/.test(parts[i])) && cur.length === 1) {
			cur = cur[0];
			i--;
		} else {
			cur = cur[parts[i]];
		}
	}
	return cur;
}

/**
 * This is the "light", more performant version of `merge()`.  It does not support a
 * customizer function or being used as a lodash iterator.
 *
 * @method mergeLight
 * @static
 * @param {Object} target - the destination object
 * @param {Object} sources - the source object
 * @return {Object} - the merged object
 */
function mergeLight(target: any, ...sources: any[]): any {
	for (let source of sources) {
		if (isTerminal(source)) {
			target = source;
		} else {
			if (isTerminal(target)) {
				target = Array.isArray(source) ? Array(source.length) : {};
			}
			for (let key in source) {
				let value: any = source[key];
				if (value !== undefined) {
					target[key] = mergeLight(target[key], value);
				}
			}
		}
	}
	return target;
}

/**
 * Merges n objects together.
 *
 * @method merge
 * @static
 * @param {Object} target - the destination object
 * @param {Object} sources - the source object
 * @param {Function} customizer - the function to customize merging properties
 *		If provided, customizer is invoked to produce the merged values of the destination and source
 *		properties. If customizer returns undefined, merging is handled by the method instead.
 * @param {Mixed} customizer.objectValue - the value at `key` in the base object
 * @param {Mixed} customizer.sourceValue - the value at `key` in the source object
 * @param {Mixed} customizer.key - the key currently being merged
 * @param {Mixed} customizer.object - the base object
 * @param {Mixed} customizer.source - the source object
 * @return {Object} - the merged object
 */
export function merge(target: any, ...sources: any): any {
	let lastSource = sources[sources.length - 1];
	if (
		typeof lastSource === 'function' ||
		(
			sources.length > 1 &&
			Array.isArray(lastSource) &&
			lastSource.indexOf(sources[0]) >= 0
		)
	) {
		return mergeHeavy(target, ...sources);
	} else {
		return mergeLight(target, ...sources);
	}
}

/**
 * This is the "heavy" version of `merge()`, which is significantly less performant than
 * the light version, but supports customizers and being used as a lodash iterator.
 *
 * @method mergeHeavy
 * @static
 * @param {Object} object - the destination object
 * @param {Object} sources - the source object
 * @param {Function} customizer - the function to customize merging properties
 *		If provided, customizer is invoked to produce the merged values of the destination and source
 *		properties. If customizer returns undefined, merging is handled by the method instead.
 * @param {Mixed} customizer.objectValue - the value at `key` in the base object
 * @param {Mixed} customizer.sourceValue - the value at `key` in the source object
 * @param {Mixed} customizer.key - the key currently being merged
 * @param {Mixed} customizer.object - the base object
 * @param {Mixed} customizer.source - the source object
 * @return {Object} - the merged object
 */
export function mergeHeavy(object, ...sources) {
	let customizer, lastSource = sources[sources.length - 1];
	let source;
	if (typeof lastSource === 'function') {
		customizer = sources.pop();
		lastSource = sources[sources.length - 1];
	}
	// check if merge is being used w/ map, reduce or similar
	if (sources.length > 1 && _.isArray(lastSource) && lastSource.indexOf(sources[0]) >= 0) {
		baseMergeHeavy(object, sources[0], customizer);
	} else {
		for (source of sources) {
			baseMergeHeavy(object, source, customizer);
		}
	}
	return object;
}
function baseMergeHeavy(object, source, customizer) {
	let key, srcValue, value, result, isCommon, hasValue, isNewValue;
	if (!isScalar(object) && !isScalar(source)) {
		for (key in source) {
			srcValue = source[key];
			if (isScalar(srcValue)) {
				value = object[key];
				result = customizer ? customizer(value, srcValue, key, object, source) : undefined;
				// isCommon => use source value instead of customizer result
				isCommon = result === undefined;
				if (isCommon) {
					result = srcValue;
				}
				hasValue = _.isArray(source) || result !== undefined;
				isNewValue = !scalarEquals(result, value) && !(isNaN(result) && isNaN(value));
				if (hasValue && (isCommon || isNewValue)) {
					object[key] = result;
				}
			} else {
				baseMergeDeepHeavy(object, source, key, customizer);
			}
		}
	}
	return object;
}
function baseMergeDeepHeavy(object, source, key, customizer) {
	let srcValue = source[key];
	let value = object[key];
	let result = customizer && customizer(value, srcValue, key, object, source);
	let isCommon = result === undefined;
	if (isCommon) {
		result = isScalar(value) ? srcValue : value;
		if (!_.isArray(srcValue)) {
			if (_.isPlainObject(srcValue) || _.isArguments(srcValue)) {
				if (_.isArguments(value)) {
					result = _.toPlainObject(value);
				} else if (!_.isArray(value) && !_.isPlainObject(value)) {
					result = {};
				}
			} else {
				isCommon = false;
			}
		}
	}
	// Recursively merge objects and arrays (susceptible to call stack limits).
	if (isCommon) {
		object[key] = baseMergeHeavy(result, srcValue, customizer);
	} else if (result !== value) {
		object[key] = result;
	}
}

/**
 * Gets the duplicates in an array
 *
 * @method getDuplicates
 * @static
 * @param {Array} arr - the array to find duplicates in
 * @return {Array} - contains the duplicates in arr
 */
const duplicatesSymbol = Symbol('duplicates');
export function getDuplicates(arr: any[]): any[] {
	return arr.reduce((memo, val) => {
		switch (memo[val]) {
			case true:
				memo[duplicatesSymbol].push(val);
				memo[val] = false;
			case undefined:
				memo[val] = true;
		}
		return memo;
	}, { [duplicatesSymbol]: [] })[duplicatesSymbol];
}

/**
 * Diffs n objects
 *
 * @method diffObjects
 * @static
 * @param {Object} ...objects - the objects to diff
 * @return {Mixed} - If no scalars are passed, returns an object with arrays of values at every
 *	path from which all source objects are different. If scalars are passed, the return value is an
 *	array with non-numeric fields. Terminal arrays will contain objects only if they contain no
 *	overlapping keys.
 *	See README.md for usage examples.
 */
const getKeys = (objects) => {
	return _.reduce(objects, (keys, obj) => {
		if (!isScalar(obj)) {
			let index, objKeys = Object.keys(obj);
			for (index = objKeys.length - 1; index >= 0; index--) {
				keys.unshift(objKeys[index]);
			}
		}
		return keys;
	}, []);
};
const getDuplicateKeys = (objects) => getDuplicates(getKeys(objects));
const getScalarOrNull = (val) => isScalar(val) ? val : null;
const getValueAtKeyOrNull = (key) => {
	return (obj) => (obj && obj[key] !== undefined) ? obj[key] : null;
};

const isCollectionOrNull = (val) => val === null || !isScalar(val);
const hasNonNullScalars = (diff) => !_.every(diff, isCollectionOrNull);

export function diffObjects(...objects: any[]): any {
	const isHeterogeneousAtKey = (key) => {
		return !_.every(objects, obj => obj && objects[0] && obj[key] === objects[0][key]);
	};

	let result = hasNonNullScalars(objects)
		? _.map(objects, getScalarOrNull)
		: {};

	let index, diffKeys = _.filter(getKeys(objects), isHeterogeneousAtKey);
	let diffValues;
	for (index = diffKeys.length - 1; index > 0; index--) {
		diffValues = _.map(objects, getValueAtKeyOrNull(diffKeys[index]));
		if (getDuplicateKeys(diffValues).length === 0) {
			result[diffKeys[index]] = diffValues;
		} else {
			result[diffKeys[index]] = hasNonNullScalars(diffValues)
				? Object.assign(diffValues, diffObjects(...diffValues))
				: diffObjects(...diffValues);
		}
	}
	return result;
}

/**
 * Diffs two objects
 *
 * @method dottedDiff
 * @static
 * @param {Mixed} val1 - the first value to diff
 * @param {Mixed} val2 - the second value to diff
 * @return {String[]} - an array of dot-separated paths to the shallowest branches
 *		present in both objects from which there are no identical scalar values.
 */
export function dottedDiff(val1: any, val2: any): string[] {
	if (isScalar(val1) && isScalar(val2)) {
		return val1 === val2 ? [] : [ '' ];
	} else {
		return Object.keys(addDottedDiffFieldsToSet({}, '', val1, val2));
	}
}
function addDottedDiffFieldsToSet(fieldSet, fieldPath, value1, value2) {
	let key, subfieldPath;
	if (!isScalar(value1) && !isScalar(value2)) {
		for (key in value1) {
			subfieldPath = fieldPath ? (fieldPath + '.' + key) : key;
			if (key in value2) {
				addDottedDiffFieldsToSet(fieldSet, subfieldPath, value1[key], value2[key]);
			} else {
				fieldSet[subfieldPath] = true;
			}
		}
		for (key in value2) {
			if (!(key in value1)) {
				subfieldPath = fieldPath ? (fieldPath + '.' + key) : key;
				fieldSet[subfieldPath] = true;
			}
		}
	} else if (!scalarEquals(value1, value2)) {
		fieldSet[fieldPath] = true;
	}
	return fieldSet;
}


/**
 * Construct a consistent hash of an object, array, or other Javascript entity.
 *
 * @method objectHash
 * @static
 * @param {Mixed} obj - The object to hash.
 * @param {boolean} forceHash - Force hashing the object even if the hash key is short.
 * @return {String} - The hash string. Long enough so collisions are extremely unlikely.
 */
export function objectHash(obj: any, forceHash: boolean = false): string {
	function hashKey(v: any): string {
		const t: string = typeof v;
		if (Array.isArray(v)) {
			let r = 'ar';
			for (let el of v) {
				let sk: string = hashKey(el);
				r += sk.length + ' ' + sk;
			}
			return r;
		} else if (t === 'object' && v !== null && !(v instanceof Date)) {
			let r = 'obj';
			let keys: string[] = Object.keys(v);
			keys.sort();
			for (let key of keys) {
				let sk: string = hashKey(v[key]);
				r += key.length + ' ' + key + sk.length + ' ' + sk;
			}
			return r;
		} else {
			return t + String(v);
		}
	}
	const MAX_KEY_SIZE = 40;
	let hk: string = hashKey(obj);
	if (hk.length <= MAX_KEY_SIZE && !forceHash) {
		return hk;
	} else {
		const hash = createHash('md5');
		hash.update(hk);
		return hash.digest('hex');
	}
}

/**
 * Converts a date string, number of miliseconds or object with a date field into
 * an instance of Date. It will return the same instance if a Date instance is passed
 * in.
 *
 * @method sanitizeDate
 * @param {String|Number|Object} val - the value to convert
 * @return {Date} - returns the converted Date instance
 */
export function sanitizeDate(val: any): Date | null {
	if (!val) return null;
	if (_.isDate(val)) return val;
	if (_.isString(val)) return new Date(Date.parse(val));
	if (_.isNumber(val)) return new Date(val);
	// @ts-ignore
	if (_.isObject(val) && val.date) return sanitizeDate(val.date);
	return null;
}

export function isPlainObject(val: any): boolean {
	let r = false;
	if (typeof val === 'object' && val !== null) {
		let proto = Object.getPrototypeOf(val);
		r = proto === Object.prototype || proto === null;
	}
	return r;
}

export function isEmptyObject(val: any): boolean {
	if (typeof val === 'object' && val) {
		for (let key in val) {
			return false;
		}
		return true;
	}
	return false;
}

export function isEmptyArray(val: any): boolean {
	if (Array.isArray(val)) {
		return !val.length;
	}
	if (val && typeof val.length === 'number') {
		return !val.length;
	}
	return false;
}

export function isEmpty(val: any): boolean {
	if (Array.isArray(val)) {
		return !val.length;
	}
	if (val) {
		if (typeof val.length === 'number') {
			return !val.length;
		}
		if (typeof val === 'object') {
			for (let key in val) {
				return false;
			}
			return true;
		}
		return false;
	}
	if (typeof val === 'number') {
		return false;
	}
	return true;
}

