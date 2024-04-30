import PoCompiler from "./PoCompiler.js";
import type { GetTextTranslations, parserOptions } from "./types.js";

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns PO object
 *
 * @param {GetTextTranslations} table Translation object
 * @param {parserOptions} options Compiler options
 * @return {string | Buffer} Compiled PO object
 */
export function compilePo(
	table: GetTextTranslations,
	options?: parserOptions,
): string | Buffer {
	const compiler = new PoCompiler(table, options);

	return compiler.compile();
}
