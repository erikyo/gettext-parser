import moCompiler from "./mocompiler.js";
import moParser from "./moparser.js";
import poCompiler from "./pocompiler.js";
import * as poParser from "./poparser.js";

import type { Transform } from "node:stream";

import type { Buffer } from "safe-buffer";
import type { GetTextTranslations, parserOptions } from "./types.js";

export interface po {
	parse: (
		buffer: Buffer | string,
		defaultCharset?: string,
	) => GetTextTranslations;
	compile: (table: GetTextTranslations, options?: parserOptions) => Buffer;
	createParseStream: (
		options?: parserOptions,
		transformOptions?: import("readable-stream").TransformOptions,
	) => Transform;
}

/**
 * Translation parser and compiler for PO files
 * @see https://www.gnu.org/software/gettext/manual/html_node/PO.html
 */
export const po: po = {
	parse: poParser.parse,
	createParseStream: poParser.stream,
	compile: poCompiler,
};

export interface mo {
	parse: (
		buffer: Buffer | string,
		defaultCharset?: string,
	) => GetTextTranslations;
	compile: (table: GetTextTranslations, options?: parserOptions) => Buffer;
}

/**
 * Translation parser and compiler for PO files
 * @see https://www.gnu.org/software/gettext/manual/html_node/MO.html
 */
export const mo: mo = {
	parse: moParser,
	compile: moCompiler,
};

export default { po, mo };
