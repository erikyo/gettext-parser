import PoParser from "./PoParser.js";
import type {
	GetTextTranslations,
	parserOptions,
	poParserOptions,
} from "./types.js";

/**
 * Parses a PO object into translation table
 *
 * @param input PO object
 * @param [options] Optional options with defaultCharset and validation
 */
export function parsePo(
	input: Buffer | string,
	options: poParserOptions = {},
): GetTextTranslations {
	const parser = new PoParser(input, options as parserOptions);

	return parser.parse();
}
