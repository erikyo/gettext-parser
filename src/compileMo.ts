import MoCompiler from "./MoCompiler.js";
import type { GetTextTranslations } from "./types.js";

/**
 * Exposes general compiler function. Takes a translation
 * object as a parameter and returns binary MO object
 *
 * @param {GetTextTranslations} table Translation object
 * @return {Buffer} Compiled binary MO object
 */
export function compileMo(table: GetTextTranslations): Buffer {
	const compiler = new MoCompiler(table);

	return compiler.compile();
}
