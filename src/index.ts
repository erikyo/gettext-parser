import moCompiler from "./mocompiler.js";
import moParser from "./moparser.js";
import poCompiler from "./pocompiler.js";
import * as poParser from "./poparser.js";

import type { Transform } from "readable-stream";

import { Buffer } from "safe-buffer";
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
 *
 * @type {import("./index.d.ts").po} po
 */
export const po = {
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
 *
 * @type {import("./index.d.ts").mo} mo
 */
export const mo = {
	parse: moParser,
	compile: moCompiler,
};

po.parse(new Buffer("test"), "iso-8859-1");

export default { po, mo } as { po: po; mo: mo };
