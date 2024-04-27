export interface GetTextComment {
	translator?: string;
	reference?: string;
	extracted?: string;
	flag?: string;
	previous?: string;
}

export interface GetTextTranslation {
	msgctxt?: string;
	msgid: string;
	msgid_plural?: string;
	msgstr: string[];
	comments?: GetTextComment;
}

export interface GetTextTranslationRaw extends GetTextTranslation {
	value: string | { [key: string]: string };
	type: number;
	key: string;
	obsolete?: boolean;
	lastNode?: boolean;
	quote?: string;
}

export interface GetTextTranslations {
	obsolete?:
		| boolean
		| { [msgctxt: string]: { [msgId: string]: GetTextTranslation } };
	charset: string;
	headers: { [headerName: string]: string };
	translations: gettextTranslation;
}

export type gettextTranslation = {
	[msgctxt: string]: { [msgId: string]: GetTextTranslation };
};

export interface parserOptions {
	foldLength: number;
	eol: string;
	defaultCharset: string;
	validation: boolean;
	escapeCharacters: boolean;
	sort: boolean;
}

export interface Compiler {
	_table: GetTextTranslations;
	compile(): Buffer | string | undefined | null;
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

export interface PoNode {
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
