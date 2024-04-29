import type { TransformOptions } from "node:stream";

/**
 * The PO translation entry
 * @property {string} msgctxt context for this translation, if not present the default context applies
 * @property {string} msgid string to be translated
 * @property {string} msgid_plural the plural form of the original string (might not be present)
 * @property {string[]} msgstr an array of translations
 * @property {GetTextComment} comments comments an object with the following properties: translator, reference, extracted, flag, previous
 * @property {string} [comments.extracted] Comment lines starting with #. contain comments given by the programmer, directed at the translator;
 * @property {string} [comments.previous] Comment lines starting with #| contain the previous untranslated string for which the translator gave a translation
 * @property {string} [comments.reference] Comment lines starting with #: contain references to the program’s source code
 * @property {string} [comments.flag] Comment lines starting with #, contain flags; more about these below
 * @property {string} [comments.translator] Comment lines starting with # which comments are created and maintained exclusively by the translator
 */
export interface TranslationEntry {
	/** msgctxt context for this translation, if not present the default context applies */
	msgctxt?: string;
	/** msgid string to be translated */
	msgid: string;
	/** msgid_plural the plural form of the original string (might not be present) */
	msgid_plural?: string;
	/** msgstr an array of translations */
	msgstr: string[];
	comments?: GetTextComment;
}

export interface GetTextComment {
	translator?: string;
	reference?: string;
	extracted?: string;
	flag?: string;
	previous?: string;
}

export interface GetTextTranslation extends TranslationEntry {}

export interface GetTextTranslationRaw extends TranslationEntry {
	value: string | { [key: string]: string };
	type: number;
	key: string;
	obsolete?: boolean;
	lastNode?: boolean;
	quote?: string;
}

export type gettextTranslation = {
	[msgctxt: string]: { [msgId: string]: TranslationEntry };
};

export interface GetTextTranslations {
	obsolete?: gettextTranslation;
	charset: string;
	headers?: Record<string, string>;
	translations: gettextTranslation;
}

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
