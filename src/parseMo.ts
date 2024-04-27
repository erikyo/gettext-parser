import { MoParser } from "./MoParser.js";
import type { GetTextTranslations } from "./types.js";

/**
 * Parses a binary MO object into translation table
 *
 * @param {Buffer} buffer Binary MO object
 * @param {String} [defaultCharset] Default charset to use
 * @return {Object} Translation object
 */
function parseMo(
	buffer: Buffer,
	defaultCharset?: string,
): GetTextTranslations | false {
	const parser = new MoParser(buffer, defaultCharset);

	return parser.parse();
}

export default parseMo;
