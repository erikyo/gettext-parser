import type { Buffer } from "safe-buffer";

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
	value: string;
	type: number;
	key: string;
	obsolete?: boolean;
	lastNode?: boolean;
}

export interface GetTextTranslations {
	obsolete?:
		| boolean
		| { [msgctxt: string]: { [msgId: string]: GetTextTranslation } };
	charset?: string;
	headers?: { [headerName: string]: string };
	translations: gettextTranslation;
}

export type gettextTranslation = {
	[msgctxt: string]: { [msgId: string]: GetTextTranslation };
};

export interface parserOptions {
	eol?: string;
	defaultCharset?: string;
	validation?: boolean;
	foldLength?: string;
	escapeCharacters?: string;
	sort?: boolean;
}

export interface Compiler {
	_table: GetTextTranslations;
	compile(): Buffer | string | undefined | null;
}
