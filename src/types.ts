import type { TransformOptions } from "node:stream";

export interface GetTextComment {
	translator?: string;
	reference?: string;
	extracted?: string;
	flag?: string;
	previous?: string;
}

export interface TranslationEntry {
	msgctxt?: string;
	msgid: string;
	msgid_plural?: string;
	msgstr: string[];
	comments?: GetTextComment;
}

export interface GetTextTranslationRaw extends TranslationEntry {
	value: string | { [key: string]: string };
	type: number;
	key: string;
	obsolete?: boolean;
	lastNode?: boolean;
	quote?: string;
}

export interface GetTextTranslations {
	obsolete?: { [msgctxt: string]: { [msgId: string]: TranslationEntry } };
	charset: string;
	headers?: Record<string, string>;
	translations: gettextTranslation;
}

export type gettextTranslation = {
	[context: string]: { [msgId: string]: TranslationEntry };
};

export interface LexerError extends SyntaxError {
	lineNumber: number;
}

export interface State {
	none?: number;
	comments: number;
	key: number;
	string: number;
	obsolete: number;
}

/**
 * The PO parser options
 */
export interface poParserOptions {
	defaultCharset?: string;
	validation?: boolean;
}

export interface parserOptions {
	foldLength: number;
	eol: string;
	defaultCharset: string;
	validation: boolean;
	escapeCharacters: boolean;
	sort: boolean;
}

export interface PoParserTransformOptions extends TransformOptions {
	initialTreshold?: number;
}

export interface PoNode {
	key: string;
	comments?: GetTextComment;
	msgctxt?: string;
	msgid?: string;
	msgid_plural?: string;
	msgstr?: string[];
	type?: number;
	value: string;
	quote?: string;
	obsolete?: boolean;
}

export type BufferWriteFunc =
	| "writeUInt32LE"
	| "writeUInt32BE"
	| "writeInt32LE"
	| "writeInt32BE";

export type BufferReadFunc =
	| "readUInt32LE"
	| "readUInt32BE"
	| "readInt32LE"
	| "readInt32BE";
