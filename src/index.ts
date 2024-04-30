import type { Transform, TransformOptions } from "node:stream";
import { compileMo } from "./compileMo.js";
import { compilePo } from "./compilePo.js";
import { parseMo } from "./parseMo.js";
import { parsePo } from "./parsePo.js";
import { streamPo } from "./streamPo.js";
import type {
	GetTextTranslations,
	parserOptions,
	poParserOptions,
} from "./types.js";

/**
 * Translation parser and compiler for PO files
 * Parse a PO file with
 *
 * @example `gettextParser.po.parse(input[, options]) → Object`
 *
 * @see https://www.gnu.org/software/gettext/manual/html_node/PO.html
 */
const po: {
	parse: (
		buffer: Buffer | string,
		options?: poParserOptions,
	) => GetTextTranslations;
	compile: (
		table: GetTextTranslations,
		options?: parserOptions,
	) => string | Buffer;
	createParseStream: (
		options?: parserOptions,
		transformOptions?: TransformOptions,
	) => Transform;
} = {
	parse: parsePo,
	createParseStream: streamPo,
	compile: compilePo,
};
/**
 * Translation parser and compiler for MO files
 * Parse a MO file with:
 *
 * @example `gettextParser.mo.parse(input[, defaultCharset]) → Object`
 *
 * @see https://www.gnu.org/software/gettext/manual/html_node/MO.html
 */
const mo: {
	parse: (
		buffer: Buffer,
		defaultCharset?: string,
	) => GetTextTranslations | false;
	compile: (table: GetTextTranslations) => Buffer;
} = {
	parse: parseMo,
	compile: compileMo,
};

const gettextParser = { po, mo };
export default gettextParser;
