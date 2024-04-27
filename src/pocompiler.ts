import type { Buffer } from "safe-buffer";
import { Compiler } from "./compiler.js";
import type { GetTextTranslations, parserOptions } from "./types.js";

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns PO object
 *
 * @param {GetTextTranslations} table Translation object
 * @param {parserOptions} options Compiler options
 * @return {Buffer} Compiled PO object
 */
export default function compile(
	table: GetTextTranslations,
	options: parserOptions,
): Buffer {
	const compiler = new Compiler(table, options);

	return compiler.compile();
}
