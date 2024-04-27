import CompilePo from "./compilePo.js";

import type { Transform, TransformOptions } from "node:stream";
import type {
	GetTextTranslations,
	parserOptions,
	poParserOptions,
} from "./types.js";

import moCompiler from "./compileMo.js";
import moParser from "./parseMo.js";
import parsePo from "./parsePo.js";
import StreamPo from "./streamPo.js";

/**
 * Translation parser and compiler for PO files
 * @see https://www.gnu.org/software/gettext/manual/html_node/PO.html
 */
export const po: {
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
	createParseStream: StreamPo,
	compile: CompilePo,
};

/**
 * Translation parser and compiler for PO files
 * @see https://www.gnu.org/software/gettext/manual/html_node/MO.html
 */
export const mo: {
	parse: (
		buffer: Buffer,
		defaultCharset?: string,
	) => GetTextTranslations | false;
	compile: (table: GetTextTranslations) => Buffer;
} = {
	parse: moParser,
	compile: moCompiler,
};

const GettextParser = { po, mo };

export default GettextParser;
